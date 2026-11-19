<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Quản lý Tổ chức (Organizations / Tenants)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Khởi tạo, phê duyệt Tổ chức giáo dục, theo dõi đồng bộ DNS Cloudflare và gói dịch vụ
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchInput"
            placeholder="Tìm theo tên, mã, subdomain..."
            allow-clear
            class="w-60"
            @press-enter="handleSearch"
            @change="() => !searchInput && handleSearch()"
          >
            <template #prefix><Icon name="ant-design:search-outlined" class="text-slate-400" /></template>
          </AInput>

          <ASelect
            v-model:value="filters.status"
            placeholder="Trạng thái"
            allow-clear
            class="w-36"
            :options="statusOptions"
            @change="handleFilterChange"
          />

          <ASelect
            v-model:value="filters.dns_status"
            placeholder="DNS Status"
            allow-clear
            class="w-36"
            :options="dnsStatusOptions"
            @change="handleFilterChange"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateModal">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Tạo Tổ chức
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="organizations"
          :loading="pending"
          :pagination="{
            current: filters.page,
            pageSize: filters.limit,
            total: total,
            showSizeChanger: true,
            showTotal: (t: number) => `Tổng ${t} tổ chức`,
          }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1100 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex items-center gap-2.5">
                <AAvatar :size="36" shape="square" :src="record.logo_url || undefined" class="shrink-0 bg-slate-100 text-slate-500">
                  <template #icon><Icon name="ant-design:bank-outlined" /></template>
                </AAvatar>
                <div class="min-w-0">
                  <div
                    class="cursor-pointer truncate font-semibold text-blue-600 hover:underline"
                    @click="navigateTo(`/organizations/${record.id}`)"
                  >
                    {{ record.name || "—" }}
                  </div>
                  <div class="font-mono text-xs text-slate-500">{{ record.code }}</div>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'subdomain'">
              <div class="font-mono text-xs text-slate-800">{{ record.subdomain || "—" }}</div>
              <ATag
                v-if="record.dns_status || !record.cloudflare_dns_record_id"
                :color="dnsColor(record.dns_status)"
                class="mt-1 text-[10px]"
              >
                DNS: {{ record.dns_status || "CHƯA TẠO" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'package'">
              <div v-if="record.primary_package_name" class="text-xs font-medium text-slate-800">
                {{ record.primary_package_name }}
              </div>
              <span v-else class="text-xs text-slate-400">Chưa cấp gói</span>
              <div v-if="record.primary_expires_at" class="text-[11px] text-slate-500">
                HSD: {{ formatDate(record.primary_expires_at) }}
              </div>
            </template>

            <template v-else-if="column.key === 'school_count'">
              <ATag color="blue">{{ record.school_count ?? 0 }} trường</ATag>
            </template>

            <template v-else-if="column.key === 'status'">
              <ATag :color="orgStatusColor(record.status)">{{ record.status || "—" }}</ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <APopconfirm
                  v-if="needsCloudflareSubdomain(record)"
                  :title="`Tạo lại subdomain '${record.subdomain}' trên Cloudflare DNS?`"
                  ok-text="Tạo lại"
                  cancel-text="Hủy"
                  @confirm="handleRetryDns(record)"
                >
                  <AButton size="small" :loading="retryingOrgId === record.id">
                    <template #icon><Icon name="ant-design:cloud-sync-outlined" /></template>
                    Tạo lại Sub
                  </AButton>
                </APopconfirm>

                <AButton size="small" type="primary" ghost @click="navigateTo(`/organizations/${record.id}`)">
                  <template #icon><Icon name="ant-design:eye-outlined" /></template>
                  Chi tiết
                </AButton>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Onboarding Tổ chức -->
    <AModal
      v-model:open="createOpen"
      title="Tạo mới Tổ chức (kèm Trường đầu tiên & School Admin)"
      :confirm-loading="submitting"
      ok-text="Khởi tạo Tổ chức"
      cancel-text="Hủy"
      width="760px"
      @ok="submitCreate"
    >
      <AForm ref="formRef" :model="createForm" :rules="formRules" layout="vertical" class="mt-2">
        <ADivider title-placement="left" class="!my-2 text-xs text-slate-500">
          1. Thông tin Tổ chức
        </ADivider>
        <AFormItem label="Logo Tổ chức" name="logo_url">
          <ImageUploadField v-model="createForm.logo_url" v-model:file="orgLogoFile" />
        </AFormItem>
        <ARow :gutter="12">
          <ACol :xs="24" :sm="12">
            <AFormItem label="Tên Tổ chức" name="name">
              <AInput v-model:value="createForm.name" placeholder="Hệ thống Giáo dục ABC" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="12">
            <AFormItem label="Mã Tổ chức" name="code">
              <AInput v-model:value="createForm.code" placeholder="EDU_ABC" class="font-mono" />
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="12">
          <ACol :xs="24" :sm="12">
            <AFormItem label="Subdomain" name="subdomain">
              <div class="flex gap-2">
                <AInput
                  v-model:value="createForm.subdomain"
                  placeholder="abc-school"
                  class="font-mono"
                  @change="subdomainChecked = null"
                />
                <AButton :loading="checkingSubdomain" @click="checkSubdomain">Kiểm tra</AButton>
              </div>
              <div
                v-if="subdomainChecked !== null"
                class="mt-1 text-xs"
                :class="subdomainChecked.available ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ subdomainChecked.message }}
              </div>
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="12">
            <AFormItem label="Mã số thuế" name="tax_code">
              <AInput v-model:value="createForm.tax_code" placeholder="0101234567" />
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="12">
          <ACol :xs="24" :sm="12">
            <AFormItem label="Email liên hệ" name="contact_email">
              <AInput v-model:value="createForm.contact_email" placeholder="contact@abc.edu.vn" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="12">
            <AFormItem label="Số điện thoại liên hệ" name="contact_phone">
              <AInput v-model:value="createForm.contact_phone" placeholder="02838123456" />
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem label="Địa chỉ Tổ chức" name="address">
          <AInput v-model:value="createForm.address" placeholder="Số 1 Đường XYZ, TP.HCM" />
        </AFormItem>

        <ADivider title-placement="left" class="!my-2 text-xs text-slate-500">
          2. Trường học đầu tiên
        </ADivider>
        <AFormItem label="Logo Trường" :name="['school', 'logo_url']">
          <ImageUploadField v-model="createForm.school.logo_url" v-model:file="schoolLogoFile" />
        </AFormItem>
        <ARow :gutter="12">
          <ACol :xs="24" :sm="10">
            <AFormItem label="Tên trường" :name="['school', 'name']">
              <AInput v-model:value="createForm.school.name" placeholder="Trường THPT ABC" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="7">
            <AFormItem label="Mã trường" :name="['school', 'code']">
              <AInput v-model:value="createForm.school.code" placeholder="THPT_ABC" class="font-mono" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="7">
            <AFormItem label="Cấp học" :name="['school', 'level']">
              <ASelect v-model:value="createForm.school.level" :options="schoolLevelOptions" />
            </AFormItem>
          </ACol>
        </ARow>

        <ADivider title-placement="left" class="!my-2 text-xs text-slate-500">
          3. Tài khoản School Admin khởi tạo
        </ADivider>
        <ARow :gutter="12">
          <ACol :xs="24" :sm="8">
            <AFormItem label="Họ tên Admin" :name="['admin', 'full_name']">
              <AInput v-model:value="createForm.admin.full_name" placeholder="Nguyễn Hiệu Trưởng" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="8">
            <AFormItem label="Email Admin" :name="['admin', 'email']">
              <AInput v-model:value="createForm.admin.email" placeholder="admin@abc.edu.vn" />
            </AFormItem>
          </ACol>
          <ACol :xs="24" :sm="8">
            <AFormItem label="Mật khẩu Admin" :name="['admin', 'password']">
              <AInputPassword v-model:value="createForm.admin.password" placeholder="Tối thiểu 8 ký tự" />
            </AFormItem>
          </ACol>
        </ARow>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import ImageUploadField from "~/components/Base/ImageUploadField.vue";
import { useMediaApi } from "~/composables/api/useMediaApi";
import { useTenantApi } from "~/composables/api/useTenantApi";
import type { OrganizationSummary } from "~/types/api/tenant";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Quản lý Tổ chức | School ERP",
});

const { platformOrganizations, platformOrganizationsCheckSubdomain } = useApi();
const tenantApi = useTenantApi();
const mediaApi = useMediaApi();
const { extractApiData, handleApiError } = useApiError();

const searchInput = ref("");
const filters = reactive({
  search: "",
  status: undefined as string | undefined,
  dns_status: undefined as string | undefined,
  page: 1,
  limit: 20,
});

const queryParams = computed(() => ({
  page: filters.page,
  limit: filters.limit,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.dns_status ? { dns_status: filters.dns_status } : {}),
}));

const {
  data: orgsRes,
  pending,
  refresh,
  error: orgsError,
} = await platformOrganizations.get({
  key: "platform-organizations-list",
  query: queryParams,
});

watch(
  () => unref(orgsError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách Tổ chức!");
  },
);

const organizations = computed<OrganizationSummary[]>(() => {
  const data = extractApiData(orgsRes);
  return Array.isArray(data) ? data : [];
});

const total = computed<number>(() => {
  const raw = unref(orgsRes) as { meta?: { total?: number } } | null;
  return raw?.meta?.total ?? organizations.value.length;
});

const statusOptions = [
  { label: "PENDING", value: "PENDING" },
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "SUSPENDED", value: "SUSPENDED" },
];

const dnsStatusOptions = [
  { label: "PENDING", value: "PENDING" },
  { label: "SYNCED", value: "SYNCED" },
  { label: "FAILED", value: "FAILED" },
];

const schoolLevelOptions = [
  { label: "Mầm non (PRESCHOOL)", value: "PRESCHOOL" },
  { label: "Tiểu học (PRIMARY)", value: "PRIMARY" },
  { label: "THCS (SECONDARY)", value: "SECONDARY" },
  { label: "THPT (HIGH_SCHOOL)", value: "HIGH_SCHOOL" },
  { label: "Liên cấp (K12)", value: "K12" },
];

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

const formatDate = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("vi-VN");
};

const columns: TableProps["columns"] = [
  { title: "Tổ chức", key: "name", width: 250 },
  { title: "Subdomain & DNS", key: "subdomain", width: 200 },
  { title: "Gói chính", key: "package", width: 190 },
  { title: "Số trường", key: "school_count", width: 110, align: "center" },
  { title: "Trạng thái", key: "status", width: 120, align: "center" },
  { title: "Thao tác", key: "actions", width: 220, fixed: "right" },
];

const retryingOrgId = ref<string | null>(null);

const needsCloudflareSubdomain = (org?: OrganizationSummary) =>
  Boolean(
    org?.id &&
      org?.subdomain &&
      (!org.cloudflare_dns_record_id || !["SYNCED", "ACTIVE"].includes(org.dns_status || "")),
  );

const handleRetryDns = async (record: OrganizationSummary) => {
  if (!record.id) return;
  retryingOrgId.value = record.id;
  try {
    const { data, error } = await tenantApi.retryOrganizationDns(record.id);
    if (handleApiError(data, error, "Tạo lại subdomain trên Cloudflare DNS thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Đã tạo lại bản ghi subdomain trên Cloudflare!");
    await refresh();
  } finally {
    retryingOrgId.value = null;
  }
};

const handleSearch = () => {
  filters.search = searchInput.value.trim();
  filters.page = 1;
};

const handleFilterChange = () => {
  filters.page = 1;
};

const handleTableChange: TableProps["onChange"] = (pagination) => {
  filters.page = pagination.current || 1;
  filters.limit = pagination.pageSize || 20;
};

// Create organization
const createOpen = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const checkingSubdomain = ref(false);
const subdomainChecked = ref<{ available: boolean; message: string } | null>(null);

const orgLogoFile = ref<File | null>(null);
const schoolLogoFile = ref<File | null>(null);

const createForm = reactive({
  name: "",
  code: "",
  logo_url: "",
  subdomain: "",
  tax_code: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  school: {
    name: "",
    code: "",
    logo_url: "",
    level: "K12",
    email: "",
    phone: "",
    address: "",
  },
  admin: {
    full_name: "",
    email: "",
    phone: "",
    password: "",
  },
});

const formRules: Record<string, Rule[]> = {
  name: [{ required: true, message: "Vui lòng nhập tên Tổ chức", trigger: "blur" }],
  code: [{ required: true, message: "Vui lòng nhập mã Tổ chức", trigger: "blur" }],
  subdomain: [{ required: true, message: "Vui lòng nhập subdomain", trigger: "blur" }],
  "school.name": [{ required: true, message: "Vui lòng nhập tên trường", trigger: "blur" }],
  "school.code": [{ required: true, message: "Vui lòng nhập mã trường", trigger: "blur" }],
  "admin.full_name": [{ required: true, message: "Vui lòng nhập tên School Admin", trigger: "blur" }],
  "admin.email": [
    { required: true, message: "Vui lòng nhập email School Admin", trigger: "blur" },
    { type: "email", message: "Email không hợp lệ", trigger: "blur" },
  ],
  "admin.password": [
    { required: true, message: "Vui lòng nhập mật khẩu School Admin", trigger: "blur" },
    { min: 8, message: "Mật khẩu tối thiểu 8 ký tự", trigger: "blur" },
  ],
};

const openCreateModal = () => {
  subdomainChecked.value = null;
  orgLogoFile.value = null;
  schoolLogoFile.value = null;
  createForm.name = "";
  createForm.code = "";
  createForm.logo_url = "";
  createForm.subdomain = "";
  createForm.tax_code = "";
  createForm.contact_email = "";
  createForm.contact_phone = "";
  createForm.address = "";
  createForm.school = { name: "", code: "", logo_url: "", level: "K12", email: "", phone: "", address: "" };
  createForm.admin = { full_name: "", email: "", phone: "", password: "" };
  createOpen.value = true;
};

const checkSubdomain = async () => {
  const sub = createForm.subdomain.trim().toLowerCase();
  if (!sub) {
    message.warning("Vui lòng nhập subdomain cần kiểm tra");
    return;
  }
  checkingSubdomain.value = true;
  try {
    const { data, error } = await platformOrganizationsCheckSubdomain.getClient({
      query: { subdomain: sub },
    });
    if (error.value) {
      const errMsg = (error.value as { data?: { message?: string } })?.data?.message || "Subdomain không hợp lệ hoặc đã được sử dụng";
      subdomainChecked.value = { available: false, message: errMsg };
      return;
    }
    const payload = extractApiData(data) as { available?: boolean; reason?: string } | null;
    if (payload && payload.available === false) {
      subdomainChecked.value = { available: false, message: payload.reason || "Subdomain đã tồn tại hoặc bị giữ chỗ" };
    } else {
      subdomainChecked.value = { available: true, message: "Subdomain hợp lệ và khả dụng!" };
    }
  } finally {
    checkingSubdomain.value = false;
  }
};

const submitCreate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  const uploadedUrls: string[] = [];
  const cleanupUploaded = async () => {
    for (const url of uploadedUrls) {
      await mediaApi.deletePlatformMediaByUrl(url).catch(() => {});
    }
  };

  try {
    let orgLogoUrl = createForm.logo_url.trim();
    if (orgLogoFile.value) {
      const up = await mediaApi.uploadAndGetUrl({ file: orgLogoFile.value, folder: "logos" });
      if (handleApiError(up.data, up.error, "Tải logo Tổ chức thất bại!")) return;
      orgLogoUrl = up.accessUrl;
      if (orgLogoUrl) uploadedUrls.push(orgLogoUrl);
    }

    let schoolLogoUrl = createForm.school.logo_url.trim();
    if (schoolLogoFile.value) {
      const up = await mediaApi.uploadAndGetUrl({ file: schoolLogoFile.value, folder: "logos" });
      if (handleApiError(up.data, up.error, "Tải logo Trường thất bại!")) {
        await cleanupUploaded();
        return;
      }
      schoolLogoUrl = up.accessUrl;
      if (schoolLogoUrl) uploadedUrls.push(schoolLogoUrl);
    }

    const payload = {
      name: createForm.name.trim(),
      code: createForm.code.trim(),
      ...(orgLogoUrl ? { logo_url: orgLogoUrl } : {}),
      subdomain: createForm.subdomain.trim().toLowerCase(),
      tax_code: createForm.tax_code.trim() || undefined,
      contact_email: createForm.contact_email.trim() || undefined,
      contact_phone: createForm.contact_phone.trim() || undefined,
      address: createForm.address.trim() || undefined,
      school: {
        name: createForm.school.name.trim(),
        code: createForm.school.code.trim(),
        ...(schoolLogoUrl ? { logo_url: schoolLogoUrl } : {}),
        level: createForm.school.level,
      },
      admin: {
        full_name: createForm.admin.full_name.trim(),
        email: createForm.admin.email.trim(),
        password: createForm.admin.password,
      },
    };

    const { data, error } = await platformOrganizations.post(payload);
    if (handleApiError(data, error, "Khởi tạo Tổ chức thất bại!")) {
      await cleanupUploaded();
      return;
    }

    message.success((unref(data) as { message?: string } | null)?.message || "Đã tạo Tổ chức thành công!");
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
