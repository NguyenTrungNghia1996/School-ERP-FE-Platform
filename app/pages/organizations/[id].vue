<template>
  <div class="space-y-4">
    <!-- Top Bar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div class="flex items-center gap-3">
          <AButton @click="navigateTo('/organizations')">
            <template #icon><Icon name="ant-design:arrow-left-outlined" /></template>
          </AButton>
          <AAvatar :size="48" shape="square" :src="org?.logo_url || undefined" class="shrink-0 bg-slate-100 text-slate-500">
            <template #icon><Icon name="ant-design:bank-outlined" /></template>
          </AAvatar>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <ATypographyTitle :level="4" style="margin: 0">
                {{ org?.name || "Chi tiết Tổ chức" }}
              </ATypographyTitle>
              <ATag v-if="org?.status" :color="orgStatusColor(org.status)">{{ org.status }}</ATag>
              <ATag v-if="org?.dns_status" :color="dnsColor(org.dns_status)">
                DNS: {{ org.dns_status }}
              </ATag>
            </div>
            <div class="font-mono text-xs text-slate-500">
              {{ org?.code || "—" }} • {{ org?.subdomain || "—" }}
            </div>
          </div>
        </div>

        <ASpace wrap>
          <AButton @click="openEditOrgModal">
            <template #icon><Icon name="ant-design:edit-outlined" /></template>
            Chỉnh sửa thông tin
          </AButton>

          <AButton :loading="loading" @click="loadAll">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <APopconfirm
            v-if="org?.status === 'PENDING'"
            title="Phê duyệt Tổ chức này?"
            ok-text="Phê duyệt"
            cancel-text="Hủy"
            @confirm="handleApprove"
          >
            <AButton type="primary" :loading="actionLoading">Phê duyệt</AButton>
          </APopconfirm>

          <AButton v-if="org?.status && org.status !== 'PENDING'" @click="openStatusModal">
            Đổi trạng thái
          </AButton>

          <AButton @click="openSubdomainModal">Đổi Subdomain</AButton>

          <APopconfirm
            v-if="needsCloudflareSubdomain"
            :title="`Tạo lại subdomain '${org?.subdomain}' trên Cloudflare DNS?`"
            ok-text="Tạo lại"
            cancel-text="Hủy"
            @confirm="handleRetryDns"
          >
            <AButton :loading="actionLoading">
              <template #icon><Icon name="ant-design:cloud-sync-outlined" /></template>
              Tạo lại Sub Cloudflare
            </AButton>
          </APopconfirm>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Tabs -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ATabs v-model:activeKey="activeTab" :items="tabItems" />

      <!-- Tab 1: Tổng quan & DNS -->
      <div v-if="activeTab === 'overview'" class="mt-3 space-y-5">
        <ADescriptions bordered size="small" :column="{ xs: 1, sm: 2 }" :items="orgItems" />

        <div v-if="org?.subdomain_histories?.length">
          <ATypographyTitle :level="5">Lịch sử đổi Subdomain &amp; Dọn DNS cũ</ATypographyTitle>
          <ClientOnly>
            <ATable
              :columns="historyColumns"
              :data-source="org.subdomain_histories"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'redirect'">
                  <span class="font-mono text-xs">{{ record.old_subdomain }}</span>
                  <span class="mx-1 text-slate-400">→</span>
                  <span class="font-mono text-xs text-blue-600">{{ record.new_subdomain }}</span>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <APopconfirm
                    v-if="record.old_cloudflare_record_id && !record.cleaned_up_at"
                    title="Xóa bản ghi Cloudflare DNS của subdomain cũ?"
                    ok-text="Xóa DNS"
                    cancel-text="Hủy"
                    @confirm="handleDeleteHistoryDns(record)"
                  >
                    <AButton size="small" danger>Xóa DNS cũ</AButton>
                  </APopconfirm>
                  <ATag v-else-if="record.cleaned_up_at" color="default">Đã dọn</ATag>
                  <span v-else class="text-xs text-slate-400">—</span>
                </template>
              </template>
            </ATable>
          </ClientOnly>
        </div>
      </div>

      <!-- Tab 2: Gói dịch vụ (Subscriptions) -->
      <div v-else-if="activeTab === 'subscriptions'" class="mt-3 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-semibold text-slate-700">
            Danh sách gói dịch vụ đã cấp ({{ subscriptions.length }})
          </div>
          <ASpace wrap>
            <AButton @click="openSwitchPrimaryModal">Đổi gói chính (PRIMARY)</AButton>
            <AButton type="primary" @click="openCreateSubModal">
              <template #icon><Icon name="ant-design:plus-outlined" /></template>
              Cấp gói dịch vụ
            </AButton>
          </ASpace>
        </div>

        <ClientOnly>
          <ATable
            :columns="subColumns"
            :data-source="subscriptions"
            :loading="loadingSubs"
            :pagination="false"
            row-key="id"
            size="middle"
            :scroll="{ x: 960 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'package'">
                <div class="font-medium text-slate-800">
                  {{ record.package_version?.package?.name || record.package_version?.version_label || record.package_version_id }}
                </div>
                <div class="text-xs text-slate-500">
                  v{{ record.package_version?.version_number ?? "—" }}
                  {{ record.package_version?.package?.code ? `• ${record.package_version.package.code}` : "" }}
                </div>
              </template>

              <template v-else-if="column.key === 'type'">
                <ATag :color="record.subscription_type === 'PRIMARY' ? 'blue' : 'purple'">
                  {{ record.subscription_type || "—" }}
                </ATag>
              </template>

              <template v-else-if="column.key === 'status'">
                <ATag :color="subStatusColor(record.status)">{{ record.status || "—" }}</ATag>
              </template>

              <template v-else-if="column.key === 'period'">
                <div class="text-xs">{{ formatDateTime(record.started_at) }}</div>
                <div class="text-xs text-slate-500">Hết hạn: {{ formatDateTime(record.expires_at) }}</div>
              </template>

              <template v-else-if="column.key === 'actions'">
                <ASpace size="small">
                  <AButton size="small" @click="openRenewModal(record)">Gia hạn</AButton>
                  <APopconfirm
                    v-if="record.status === 'ACTIVE'"
                    title="Tạm ngưng gói dịch vụ này?"
                    ok-text="Tạm ngưng"
                    cancel-text="Hủy"
                    @confirm="handleSuspendSub(record)"
                  >
                    <AButton size="small">Tạm ngưng</AButton>
                  </APopconfirm>
                  <APopconfirm
                    v-if="record.status !== 'REVOKED'"
                    title="Thu hồi vĩnh viễn gói dịch vụ này?"
                    ok-text="Thu hồi"
                    cancel-text="Hủy"
                    @confirm="handleRevokeSub(record)"
                  >
                    <AButton size="small" danger>Thu hồi</AButton>
                  </APopconfirm>
                </ASpace>
              </template>
            </template>
          </ATable>
        </ClientOnly>
      </div>

      <!-- Tab 3: Entitlements -->
      <div v-else-if="activeTab === 'entitlements'" class="mt-3 space-y-4">
        <ASpin :spinning="loadingEntitlements">
          <div v-if="entitlements" class="space-y-4">
            <ADescriptions bordered size="small" :column="{ xs: 1, sm: 2 }" :items="entitlementSummaryItems" />

            <div>
              <div class="mb-2 text-sm font-semibold text-slate-700">
                Tính năng được kích hoạt ({{ entitlements.enabled_features?.length ?? 0 }})
              </div>
              <div v-if="entitlements.enabled_features?.length" class="flex flex-wrap gap-1.5">
                <ATag v-for="feat in entitlements.enabled_features" :key="feat" color="geekblue" class="font-mono text-xs">
                  {{ feat }}
                </ATag>
              </div>
              <span v-else class="text-xs text-slate-400">Chưa có tính năng nào được kích hoạt</span>
            </div>

            <div>
              <div class="mb-2 text-sm font-semibold text-slate-700">Hạn mức hiệu lực (Effective Quotas)</div>
              <pre v-if="entitlements.effective_quotas" class="m-0 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{{ JSON.stringify(entitlements.effective_quotas, null, 2) }}</pre>
              <span v-else class="text-xs text-slate-400">Không có quota giới hạn</span>
            </div>
          </div>
          <AEmpty v-else description="Chưa có dữ liệu Entitlements" />
        </ASpin>
      </div>

      <!-- Tab 4: Media & Lưu trữ -->
      <div v-else-if="activeTab === 'media'" class="mt-3">
        <OrgMediaTab :org-id="orgId" />
      </div>
    </ACard>

    <!-- Modal Đổi trạng thái Tổ chức -->
    <AModal
      v-model:open="statusModalOpen"
      title="Cập nhật trạng thái Tổ chức"
      :confirm-loading="actionLoading"
      ok-text="Cập nhật"
      cancel-text="Hủy"
      @ok="submitStatus"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Trạng thái">
          <ASelect v-model:value="statusForm.status" :options="orgStatusOptions" />
        </AFormItem>
        <AFormItem label="Lý do">
          <ATextarea v-model:value="statusForm.reason" :rows="3" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Đổi Subdomain -->
    <AModal
      v-model:open="subdomainModalOpen"
      title="Đổi Subdomain chính"
      :confirm-loading="actionLoading"
      ok-text="Xác nhận đổi"
      cancel-text="Hủy"
      @ok="submitChangeSubdomain"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Subdomain mới">
          <AInput v-model:value="subdomainForm.new_subdomain" placeholder="new-subdomain" class="font-mono" />
        </AFormItem>
        <AFormItem label="Lý do đổi">
          <ATextarea v-model:value="subdomainForm.reason" :rows="2" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Cấp gói / Đổi gói chính / Gia hạn -->
    <AModal
      v-model:open="subModalOpen"
      :title="subModalTitle"
      :confirm-loading="actionLoading"
      ok-text="Xác nhận"
      cancel-text="Hủy"
      @ok="submitSubscriptionAction"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Phiên bản gói dịch vụ (PUBLISHED)">
          <ASelect
            v-model:value="subForm.package_version_id"
            show-search
            option-filter-prop="label"
            placeholder="Chọn phiên bản gói"
            :options="publishedVersionOptions"
          />
        </AFormItem>

        <AFormItem label="Ngày hết hạn mới (ISO / YYYY-MM-DD)">
          <AInput v-model:value="subForm.expires_at" placeholder="2027-12-31T23:59:59Z" class="font-mono" />
        </AFormItem>

        <AFormItem v-if="subModalMode === 'create'" label="Tự động gia hạn">
          <ACheckbox v-model:checked="subForm.auto_renew">Bật tự động gia hạn</ACheckbox>
        </AFormItem>

        <AFormItem v-if="subModalMode === 'switch'" label="Lý do chuyển đổi gói chính">
          <AInput v-model:value="subForm.reason" placeholder="Nâng cấp gói năm học mới" />
        </AFormItem>

        <AFormItem label="Ghi chú">
          <ATextarea v-model:value="subForm.notes" :rows="2" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Chỉnh sửa thông tin & Logo Tổ chức (PATCH /v1/platform/organizations/{id}) -->
    <AModal
      v-model:open="editOrgModalOpen"
      title="Chỉnh sửa thông tin Tổ chức"
      :confirm-loading="actionLoading"
      ok-text="Lưu thay đổi"
      cancel-text="Hủy"
      width="620px"
      @ok="submitEditOrg"
    >
      <AForm ref="editOrgFormRef" :model="editOrgForm" :rules="editOrgRules" layout="vertical" class="mt-3">
        <AFormItem label="Logo Tổ chức">
          <ImageUploadField v-model="editOrgForm.logo_url" v-model:file="editOrgLogoFile" />
        </AFormItem>
        <ARow :gutter="12">
          <ACol :xs="24" :sm="14">
            <AFormItem label="Tên Tổ chức" name="name">
              <AInput v-model:value="editOrgForm.name" placeholder="Hệ thống Trường THPT Chu Văn An" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="10">
            <AFormItem label="Mã số thuế" name="tax_code">
              <AInput v-model:value="editOrgForm.tax_code" placeholder="0101234567" />
            </AFormItem>
          </ACol>
        </ARow>
        <ARow :gutter="12">
          <ACol :xs="24" :sm="12">
            <AFormItem label="Email liên hệ" name="contact_email">
              <AInput v-model:value="editOrgForm.contact_email" placeholder="contact@chuvanan.edu.vn" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="12">
            <AFormItem label="Số điện thoại liên hệ" name="contact_phone">
              <AInput v-model:value="editOrgForm.contact_phone" placeholder="02438889999" />
            </AFormItem>
          </ACol>
        </ARow>
        <AFormItem label="Địa chỉ" name="address">
          <AInput v-model:value="editOrgForm.address" placeholder="Số 10 Thụy Khuê, Tây Hồ, Hà Nội" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { DescriptionsItemType, FormInstance, Rule, TableProps, TabsProps } from "antdv-next";
import ImageUploadField from "~/components/Base/ImageUploadField.vue";
import OrgMediaTab from "~/components/Organizations/OrgMediaTab.vue";
import { useBillingApi } from "~/composables/api/useBillingApi";
import { useMediaApi } from "~/composables/api/useMediaApi";
import { useTenantApi } from "~/composables/api/useTenantApi";
import type {
  OrganizationEntitlement,
  OrganizationSubscription,
  ServicePackageWithSummary,
} from "~/types/api/billing";
import type { Organization, OrganizationSubdomainHistory } from "~/types/api/tenant";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Chi tiết Tổ chức | School ERP",
});

const route = useRoute();
const orgId = computed(() => String(route.params.id || ""));

const { platformPackages } = useApi();
const tenantApi = useTenantApi();
const billingApi = useBillingApi();
const mediaApi = useMediaApi();
const { extractApiData, handleApiError } = useApiError();

const activeTab = ref<"overview" | "subscriptions" | "entitlements" | "media">("overview");
const tabItems: TabsProps["items"] = [
  { key: "overview", label: "Tổng quan & DNS" },
  { key: "subscriptions", label: "Gói dịch vụ (Subscriptions)" },
  { key: "entitlements", label: "Quyền lợi hiệu lực (Entitlements)" },
  { key: "media", label: "Media & Lưu trữ" },
];

const loading = ref(false);
const loadingSubs = ref(false);
const loadingEntitlements = ref(false);
const actionLoading = ref(false);

const org = ref<Organization | null>(null);
const subscriptions = ref<OrganizationSubscription[]>([]);
const entitlements = ref<OrganizationEntitlement | null>(null);

const loadOrg = async () => {
  if (!orgId.value) return;
  loading.value = true;
  try {
    const { data, error } = await tenantApi.getOrganization(orgId.value);
    if (handleApiError(data, error, "Không thể tải chi tiết Tổ chức!")) return;
    org.value = (extractApiData(data) as Organization) ?? null;
  } finally {
    loading.value = false;
  }
};

const loadSubscriptions = async () => {
  if (!orgId.value) return;
  loadingSubs.value = true;
  try {
    const { data, error } = await billingApi.getOrgSubscriptions(orgId.value);
    if (handleApiError(data, error, "Không thể tải danh sách gói dịch vụ của Tổ chức!")) return;
    const list = extractApiData(data);
    subscriptions.value = Array.isArray(list) ? list : [];
  } finally {
    loadingSubs.value = false;
  }
};

const loadEntitlements = async () => {
  if (!orgId.value) return;
  loadingEntitlements.value = true;
  try {
    const { data, error } = await billingApi.getOrgEntitlements(orgId.value);
    if (handleApiError(data, error, "Không thể tải Entitlements!")) return;
    entitlements.value = (extractApiData(data) as OrganizationEntitlement) ?? null;
  } finally {
    loadingEntitlements.value = false;
  }
};

const loadAll = async () => {
  await Promise.all([loadOrg(), loadSubscriptions(), loadEntitlements()]);
};

// Load packages để chọn version khi cấp gói
const { data: packagesRes } = await platformPackages.get({ key: "org-packages-options" });
const publishedVersionOptions = computed(() => {
  const pkgs = extractApiData(packagesRes);
  if (!Array.isArray(pkgs)) return [];
  const options: { label: string; value: string }[] = [];
  for (const pkg of pkgs as ServicePackageWithSummary[]) {
    const versions = pkg.versions?.length
      ? pkg.versions
      : pkg.latest_published_version
        ? [pkg.latest_published_version]
        : [];
    for (const v of versions) {
      if (v.id && (!v.status || v.status === "PUBLISHED")) {
        options.push({
          label: `[${pkg.package_type}] ${pkg.name} — v${v.version_number ?? 1} ${v.version_label || ""}`,
          value: v.id,
        });
      }
    }
  }
  return options;
});

onMounted(() => {
  loadAll();
});

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};

const orgStatusColor = (status?: string) => {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "processing";
  if (status === "SUSPENDED") return "error";
  return "default";
};

const dnsColor = (status?: string) => {
  if (status === "SYNCED" || status === "ACTIVE") return "green";
  if (status === "FAILED") return "red";
  return "orange";
};

const subStatusColor = (status?: string) => {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  if (status === "REVOKED" || status === "EXPIRED") return "error";
  return "default";
};

const orgItems = computed<DescriptionsItemType[]>(() => [
  { key: "code", label: "Mã Tổ chức", content: org.value?.code || "—" },
  { key: "subdomain", label: "Subdomain", content: org.value?.subdomain || "—" },
  { key: "tax_code", label: "Mã số thuế", content: org.value?.tax_code || "—" },
  { key: "email", label: "Email liên hệ", content: org.value?.contact_email || "—" },
  { key: "phone", label: "Điện thoại", content: org.value?.contact_phone || "—" },
  { key: "address", label: "Địa chỉ", content: org.value?.address || "—" },
  { key: "cf_id", label: "Cloudflare Record ID", content: org.value?.cloudflare_dns_record_id || "—" },
  { key: "dns_synced", label: "Đồng bộ DNS lúc", content: formatDateTime(org.value?.dns_synced_at) },
  { key: "dns_err", label: "Lỗi DNS gần nhất", content: org.value?.dns_last_error || "Không có" },
  { key: "approved", label: "Phê duyệt lúc", content: formatDateTime(org.value?.approved_at) },
]);

const entitlementSummaryItems = computed<DescriptionsItemType[]>(() => [
  {
    key: "primary",
    label: "Gói chính (PRIMARY)",
    content: entitlements.value?.primary_package
      ? `${entitlements.value.primary_package.package_name} (v${entitlements.value.primary_package.version_number ?? 1})`
      : "—",
  },
  {
    key: "addons",
    label: "Gói bổ sung (ADDON)",
    content: entitlements.value?.active_addons?.length
      ? entitlements.value.active_addons.map((a) => a.package_name).join(", ")
      : "Không có",
  },
  {
    key: "expiry",
    label: "Ngày hết hạn gần nhất",
    content: formatDateTime(entitlements.value?.nearest_expiry_at),
  },
  {
    key: "calc",
    label: "Tính toán lúc",
    content: formatDateTime(entitlements.value?.calculated_at),
  },
]);

const historyColumns: TableProps["columns"] = [
  { title: "Chuyển đổi Subdomain", key: "redirect" },
  { title: "Lý do", dataIndex: "reason", key: "reason" },
  { title: "Thao tác", key: "actions", width: 130 },
];

const subColumns: TableProps["columns"] = [
  { title: "Gói & Phiên bản", key: "package", width: 240 },
  { title: "Loại", key: "type", width: 110, align: "center" },
  { title: "Trạng thái", key: "status", width: 120, align: "center" },
  { title: "Thời hạn", key: "period", width: 200 },
  { title: "Ghi chú", dataIndex: "notes", key: "notes" },
  { title: "Thao tác", key: "actions", width: 230, fixed: "right" },
];

// Organization Actions
const handleApprove = async () => {
  actionLoading.value = true;
  try {
    const { data, error } = await tenantApi.approveOrganization(orgId.value);
    if (handleApiError(data, error, "Phê duyệt Tổ chức thất bại!")) return;
    message.success("Đã phê duyệt Tổ chức!");
    await loadOrg();
  } finally {
    actionLoading.value = false;
  }
};

const handleRetryDns = async () => {
  actionLoading.value = true;
  try {
    const { data, error } = await tenantApi.retryOrganizationDns(orgId.value);
    if (handleApiError(data, error, "Tạo lại subdomain trên Cloudflare DNS thất bại!")) return;
    message.success("Đã tạo lại bản ghi subdomain trên Cloudflare!");
    await loadOrg();
  } finally {
    actionLoading.value = false;
  }
};

const needsCloudflareSubdomain = computed(() =>
  Boolean(
    org.value?.id &&
      org.value?.subdomain &&
      (!org.value.cloudflare_dns_record_id || !["SYNCED", "ACTIVE"].includes(org.value.dns_status || "")),
  ),
);

const handleDeleteHistoryDns = async (record: OrganizationSubdomainHistory) => {
  if (!record.id) return;
  const { data, error } = await tenantApi.deleteSubdomainHistoryDns(record.id);
  if (handleApiError(data, error, "Xóa DNS cũ thất bại!")) return;
  message.success("Đã xóa bản ghi DNS cũ!");
  await loadOrg();
};

const statusModalOpen = ref(false);
const orgStatusOptions = [
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "SUSPENDED", value: "SUSPENDED" },
];
const statusForm = reactive({ status: "ACTIVE", reason: "" });

const openStatusModal = () => {
  statusForm.status = org.value?.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  statusForm.reason = "";
  statusModalOpen.value = true;
};

const submitStatus = async () => {
  actionLoading.value = true;
  try {
    const { data, error } = await tenantApi.updateOrganizationStatus(orgId.value, {
      status: statusForm.status,
      reason: statusForm.reason.trim() || undefined,
    });
    if (handleApiError(data, error, "Cập nhật trạng thái thất bại!")) return;
    message.success("Đã cập nhật trạng thái Tổ chức!");
    statusModalOpen.value = false;
    await loadOrg();
  } finally {
    actionLoading.value = false;
  }
};

const subdomainModalOpen = ref(false);
const subdomainForm = reactive({ new_subdomain: "", reason: "" });

const editOrgModalOpen = ref(false);
const editOrgFormRef = ref<FormInstance>();
const editOrgLogoFile = ref<File | null>(null);
const editOrgForm = reactive({
  name: "",
  logo_url: "",
  contact_email: "",
  contact_phone: "",
  tax_code: "",
  address: "",
});
const editOrgRules: Record<string, Rule[]> = {
  name: [{ required: true, message: "Vui lòng nhập tên Tổ chức", trigger: "blur" }],
};

const openEditOrgModal = () => {
  editOrgLogoFile.value = null;
  editOrgForm.name = org.value?.name || "";
  editOrgForm.logo_url = org.value?.logo_url || "";
  editOrgForm.contact_email = org.value?.contact_email || "";
  editOrgForm.contact_phone = org.value?.contact_phone || "";
  editOrgForm.tax_code = org.value?.tax_code || "";
  editOrgForm.address = org.value?.address || "";
  editOrgModalOpen.value = true;
};

const submitEditOrg = async () => {
  try {
    await editOrgFormRef.value?.validate();
  } catch {
    return;
  }

  actionLoading.value = true;
  try {
    const { ok } = await mediaApi.saveWithImageReplace({
      file: editOrgLogoFile.value,
      currentUrl: editOrgForm.logo_url,
      previousUrl: org.value?.logo_url,
      orgId: orgId.value,
      folder: "logos",
      errorMessage: "Cập nhật thông tin Tổ chức thất bại!",
      saveFn: (finalUrl) =>
        tenantApi.updateOrganization(orgId.value, {
          name: editOrgForm.name.trim(),
          logo_url: finalUrl,
          contact_email: editOrgForm.contact_email.trim() || undefined,
          contact_phone: editOrgForm.contact_phone.trim() || undefined,
          tax_code: editOrgForm.tax_code.trim() || undefined,
          address: editOrgForm.address.trim() || undefined,
        }),
    });
    if (!ok) return;

    message.success("Đã cập nhật thông tin Tổ chức!");
    editOrgModalOpen.value = false;
    await loadOrg();
  } finally {
    actionLoading.value = false;
  }
};

const openSubdomainModal = () => {
  subdomainForm.new_subdomain = org.value?.subdomain || "";
  subdomainForm.reason = "";
  subdomainModalOpen.value = true;
};

const submitChangeSubdomain = async () => {
  if (!subdomainForm.new_subdomain.trim()) {
    message.warning("Vui lòng nhập subdomain mới");
    return;
  }
  actionLoading.value = true;
  try {
    const sub = subdomainForm.new_subdomain.trim().toLowerCase();
    const { data, error } = await tenantApi.changeOrganizationSubdomain(orgId.value, {
      new_subdomain: sub,
      subdomain: sub,
      reason: subdomainForm.reason.trim() || undefined,
    });
    if (handleApiError(data, error, "Đổi Subdomain thất bại!")) return;
    message.success("Đã đổi Subdomain thành công!");
    subdomainModalOpen.value = false;
    await loadOrg();
  } finally {
    actionLoading.value = false;
  }
};

// Subscription Actions
const subModalOpen = ref(false);
const subModalMode = ref<"create" | "switch" | "renew">("create");
const activeSubId = ref<string | null>(null);
const subForm = reactive({
  package_version_id: undefined as string | undefined,
  expires_at: "",
  auto_renew: true,
  reason: "",
  notes: "",
});

const subModalTitle = computed(() => {
  if (subModalMode.value === "switch") return "Chuyển đổi gói chính (PRIMARY)";
  if (subModalMode.value === "renew") return "Gia hạn gói dịch vụ";
  return "Cấp gói dịch vụ cho Tổ chức";
});

const openCreateSubModal = () => {
  subModalMode.value = "create";
  activeSubId.value = null;
  subForm.package_version_id = undefined;
  subForm.expires_at = "";
  subForm.auto_renew = true;
  subForm.notes = "";
  subModalOpen.value = true;
};

const openSwitchPrimaryModal = () => {
  subModalMode.value = "switch";
  activeSubId.value = null;
  subForm.package_version_id = undefined;
  subForm.expires_at = "";
  subForm.reason = "";
  subForm.notes = "";
  subModalOpen.value = true;
};

const openRenewModal = (record: OrganizationSubscription) => {
  subModalMode.value = "renew";
  activeSubId.value = record.id || null;
  subForm.package_version_id = record.package_version_id;
  subForm.expires_at = "";
  subForm.notes = "";
  subModalOpen.value = true;
};

const submitSubscriptionAction = async () => {
  if (!subForm.package_version_id && subModalMode.value !== "renew") {
    message.warning("Vui lòng chọn phiên bản gói dịch vụ");
    return;
  }

  actionLoading.value = true;
  try {
    let res;
    if (subModalMode.value === "create") {
      res = await billingApi.createOrgSubscription(orgId.value, {
        package_version_id: subForm.package_version_id,
        expires_at: subForm.expires_at.trim() || undefined,
        auto_renew: subForm.auto_renew,
        notes: subForm.notes.trim() || undefined,
      });
    } else if (subModalMode.value === "switch") {
      res = await billingApi.switchOrgPrimary(orgId.value, {
        package_version_id: subForm.package_version_id,
        new_expires_at: subForm.expires_at.trim() || undefined,
        reason: subForm.reason.trim() || undefined,
        notes: subForm.notes.trim() || undefined,
      });
    } else if (activeSubId.value) {
      res = await billingApi.renewSubscription(activeSubId.value, {
        package_version_id: subForm.package_version_id,
        new_expires_at: subForm.expires_at.trim() || undefined,
        notes: subForm.notes.trim() || undefined,
      });
    }

    if (res && handleApiError(res.data, res.error, "Thao tác gói dịch vụ thất bại!")) return;

    message.success("Thao tác gói dịch vụ thành công!");
    subModalOpen.value = false;
    await Promise.all([loadSubscriptions(), loadEntitlements(), loadOrg()]);
  } finally {
    actionLoading.value = false;
  }
};

const handleSuspendSub = async (record: OrganizationSubscription) => {
  if (!record.id) return;
  const { data, error } = await billingApi.suspendSubscription(record.id, {});
  if (handleApiError(data, error, "Tạm ngưng gói thất bại!")) return;
  message.success("Đã tạm ngưng gói dịch vụ!");
  await Promise.all([loadSubscriptions(), loadEntitlements()]);
};

const handleRevokeSub = async (record: OrganizationSubscription) => {
  if (!record.id) return;
  const { data, error } = await billingApi.revokeSubscription(record.id, {});
  if (handleApiError(data, error, "Thu hồi gói thất bại!")) return;
  message.success("Đã thu hồi gói dịch vụ!");
  await Promise.all([loadSubscriptions(), loadEntitlements()]);
};
</script>
