<template>
  <div class="space-y-4">
    <!-- Header -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div class="flex items-center gap-3">
          <AButton @click="navigateTo('/packages')">
            <template #icon><Icon name="ant-design:arrow-left-outlined" /></template>
          </AButton>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <ATypographyTitle :level="4" style="margin: 0">
                {{ pkg?.name || "Chi tiết gói dịch vụ" }}
              </ATypographyTitle>
              <ATag v-if="pkg?.package_type" :color="pkg.package_type === 'PRIMARY' ? 'blue' : 'purple'">
                {{ pkg.package_type }}
              </ATag>
              <ATag v-if="pkg" :color="pkg.is_active !== false ? 'success' : 'error'">
                {{ pkg.is_active !== false ? "Hoạt động" : "Tắt" }}
              </ATag>
            </div>
            <div class="font-mono text-xs text-slate-500">{{ pkg?.code || packageId }}</div>
          </div>
        </div>

        <ASpace wrap>
          <AButton :loading="loading" @click="loadDetail">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>
          <AButton type="primary" @click="openVersionModal()">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Tạo phiên bản (DRAFT)
          </AButton>
        </ASpace>
      </AFlex>

      <ADescriptions v-if="pkg" bordered size="small" :column="{ xs: 1, sm: 3 }" :items="packageSummaryItems" class="mt-4" />
    </ACard>

    <!-- Versions Table -->
    <ACard title="Danh sách các phiên bản (Package Versions)" class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="versions"
          :loading="loading"
          :pagination="false"
          row-key="id"
          size="middle"
          :scroll="{ x: 1000 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'version'">
              <div class="font-semibold text-slate-800">
                v{{ record.version_number ?? "—" }}
                <span v-if="record.version_label" class="font-normal text-slate-500">
                  ({{ record.version_label }})
                </span>
              </div>
              <div v-if="record.release_notes" class="text-xs text-slate-500">{{ record.release_notes }}</div>
            </template>

            <template v-else-if="column.key === 'status'">
              <ATag :color="versionStatusColor(record.status)">{{ record.status || "—" }}</ATag>
            </template>

            <template v-else-if="column.key === 'pricing'">
              <div class="font-medium text-slate-800">
                {{ formatPrice(record.base_price, record.currency) }}
              </div>
              <div class="text-xs text-slate-500">{{ record.billing_cycle || "—" }}</div>
            </template>

            <template v-else-if="column.key === 'features'">
              <div v-if="record.features?.length" class="flex flex-wrap gap-1">
                <ATag v-for="f in record.features.slice(0, 4)" :key="f.id || f.code" class="text-[11px]">
                  {{ f.name || f.code }}
                </ATag>
                <ATag v-if="record.features.length > 4" color="blue" class="text-[11px]">
                  +{{ record.features.length - 4 }}
                </ATag>
              </div>
              <span v-else class="text-xs text-slate-400">Chưa gắn feature</span>
            </template>

            <template v-else-if="column.key === 'quotas'">
              <pre v-if="record.quotas && Object.keys(record.quotas).length" class="m-0 max-w-xs overflow-auto rounded bg-slate-50 p-1.5 font-mono text-[11px] text-slate-700">{{ JSON.stringify(record.quotas) }}</pre>
              <span v-else class="text-xs text-slate-400">—</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <AButton v-if="record.status === 'DRAFT'" size="small" @click="openVersionModal(record)">
                  <template #icon><Icon name="ant-design:edit-outlined" /></template>
                  Sửa
                </AButton>
                <APopconfirm
                  v-if="record.status === 'DRAFT'"
                  title="Phát hành phiên bản này? Sau khi phát hành sẽ không thể chỉnh sửa."
                  ok-text="Phát hành"
                  cancel-text="Hủy"
                  @confirm="handlePublish(record)"
                >
                  <AButton size="small" type="primary">Phát hành</AButton>
                </APopconfirm>
                <APopconfirm
                  v-if="record.status === 'DRAFT'"
                  title="Xóa phiên bản DRAFT này?"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeleteVersion(record)"
                >
                  <AButton size="small" danger>Xóa</AButton>
                </APopconfirm>
                <APopconfirm
                  v-if="record.status === 'PUBLISHED'"
                  title="Ngừng phát hành (Deprecate) phiên bản này?"
                  ok-text="Ngừng phát hành"
                  cancel-text="Hủy"
                  @confirm="handleDeprecate(record)"
                >
                  <AButton size="small" danger>Ngừng phát hành</AButton>
                </APopconfirm>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Create / Edit Version -->
    <AModal
      v-model:open="versionOpen"
      :title="editingVersionId ? 'Cập nhật phiên bản DRAFT' : 'Tạo phiên bản mới (DRAFT)'"
      :confirm-loading="submitting"
      :ok-text="editingVersionId ? 'Lưu thay đổi' : 'Tạo phiên bản'"
      cancel-text="Hủy"
      width="640px"
      @ok="submitVersion"
    >
      <AForm ref="versionFormRef" :model="versionForm" :rules="versionRules" layout="vertical" class="mt-3">
        <ARow :gutter="12">
          <ACol :span="12">
            <AFormItem label="Nhãn phiên bản" name="version_label">
              <AInput v-model:value="versionForm.version_label" placeholder="v1.0.0 / Năm học 2026" />
            </AFormItem>
          </ACol>
          <ACol :span="12" v-if="!editingVersionId">
            <AFormItem label="Nhân bản từ phiên bản (tuỳ chọn)" name="clone_from_version_id">
              <ASelect
                v-model:value="versionForm.clone_from_version_id"
                allow-clear
                placeholder="Chọn phiên bản nguồn"
                :options="cloneVersionOptions"
              />
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="12">
          <ACol :span="8">
            <AFormItem label="Giá cơ bản" name="base_price">
              <AInputNumber v-model:value="versionForm.base_price" :min="0" class="!w-full" />
            </AFormItem>
          </ACol>
          <ACol :span="8">
            <AFormItem label="Tiền tệ" name="currency">
              <ASelect v-model:value="versionForm.currency" :options="currencyOptions" />
            </AFormItem>
          </ACol>
          <ACol :span="8">
            <AFormItem label="Chu kỳ" name="billing_cycle">
              <ASelect v-model:value="versionForm.billing_cycle" :options="cycleOptions" />
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem label="Danh sách tính năng (Features)" name="feature_ids">
          <ASelect
            v-model:value="versionForm.feature_ids"
            mode="multiple"
            show-search
            option-filter-prop="label"
            placeholder="Chọn tính năng từ Feature Catalog"
            :options="featureOptions"
          />
        </AFormItem>

        <AFormItem label="Giới hạn tài nguyên (Quotas - JSON)" name="quotasJson">
          <ATextarea
            v-model:value="versionForm.quotasJson"
            :rows="3"
            class="font-mono text-xs"
            placeholder='{"max_students": 1000, "max_schools": 3}'
          />
        </AFormItem>

        <AFormItem label="Ghi chú phát hành" name="release_notes">
          <ATextarea v-model:value="versionForm.release_notes" :rows="2" placeholder="Nội dung cập nhật" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { DescriptionsItemType, FormInstance, Rule, TableProps } from "antdv-next";
import { useBillingApi } from "~/composables/api/useBillingApi";
import type { ServicePackage, ServicePackageVersion } from "~/types/api/billing";
import type { CatalogFeature } from "~/types/api/catalog";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Chi tiết Gói dịch vụ | School ERP",
});

const route = useRoute();
const packageId = computed(() => String(route.params.id || ""));

const { catalogFeatures } = useApi();
const billingApi = useBillingApi();
const { extractApiData, handleApiError } = useApiError();

const loading = ref(false);
const pkg = ref<ServicePackage | null>(null);
const versions = computed<ServicePackageVersion[]>(() => pkg.value?.versions ?? []);

const loadDetail = async () => {
  if (!packageId.value) return;
  loading.value = true;
  try {
    const { data, error } = await billingApi.getPackage(packageId.value);
    if (handleApiError(data, error, "Không thể tải chi tiết gói dịch vụ!")) return;
    pkg.value = (extractApiData(data) as ServicePackage) ?? null;
  } finally {
    loading.value = false;
  }
};

const { data: featuresRes } = await catalogFeatures.get({ key: "billing-feature-options" });
const featureOptions = computed(() => {
  const list = extractApiData(featuresRes);
  if (!Array.isArray(list)) return [];
  return (list as CatalogFeature[]).map((f) => ({
    label: `${f.name || f.code} (${f.code || ""})`,
    value: f.id || "",
  }));
});

onMounted(() => {
  loadDetail();
});

const packageSummaryItems = computed<DescriptionsItemType[]>(() => [
  { key: "code", label: "Mã gói", content: pkg.value?.code || "—" },
  { key: "public", label: "Công khai", content: pkg.value?.is_public ? "Có" : "Nội bộ" },
  { key: "desc", label: "Mô tả", content: pkg.value?.description || "—" },
]);

const versionStatusColor = (status?: string) => {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "processing";
  if (status === "DEPRECATED") return "default";
  return "default";
};

const formatPrice = (price?: number, currency = "VND") => {
  if (price === undefined || price === null) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(price)} ${currency}`;
};

const columns: TableProps["columns"] = [
  { title: "Phiên bản", key: "version", width: 220 },
  { title: "Trạng thái", key: "status", width: 120, align: "center" },
  { title: "Giá & Chu kỳ", key: "pricing", width: 170 },
  { title: "Tính năng", key: "features", width: 240 },
  { title: "Quotas", key: "quotas", width: 200 },
  { title: "Thao tác", key: "actions", width: 200, fixed: "right" },
];

// Create / Edit Version
const versionOpen = ref(false);
const submitting = ref(false);
const editingVersionId = ref<string | null>(null);
const versionFormRef = ref<FormInstance>();

const versionForm = reactive({
  version_label: "",
  base_price: 0,
  currency: "VND",
  billing_cycle: "YEARLY",
  feature_ids: [] as string[],
  quotasJson: "{}",
  release_notes: "",
  clone_from_version_id: undefined as string | undefined,
});

const currencyOptions = [
  { label: "VND", value: "VND" },
  { label: "USD", value: "USD" },
];

const cycleOptions = [
  { label: "MONTHLY", value: "MONTHLY" },
  { label: "QUARTERLY", value: "QUARTERLY" },
  { label: "YEARLY", value: "YEARLY" },
  { label: "LIFETIME", value: "LIFETIME" },
];

const cloneVersionOptions = computed(() =>
  versions.value.map((v) => ({
    label: `v${v.version_number ?? ""} ${v.version_label ? `- ${v.version_label}` : ""} (${v.status})`,
    value: v.id || "",
  })),
);

const validateQuotasJson = (_rule: Rule, value: string) => {
  if (!value?.trim()) return Promise.resolve();
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
      return Promise.reject("Quotas phải là JSON object");
    }
    return Promise.resolve();
  } catch {
    return Promise.reject("JSON không hợp lệ");
  }
};

const versionRules: Record<string, Rule[]> = {
  version_label: [{ required: true, message: "Vui lòng nhập nhãn phiên bản", trigger: "blur" }],
  quotasJson: [{ validator: validateQuotasJson, trigger: "blur" }],
};

const openVersionModal = (record?: ServicePackageVersion) => {
  if (record?.id) {
    editingVersionId.value = record.id;
    versionForm.version_label = record.version_label || "";
    versionForm.base_price = record.base_price ?? 0;
    versionForm.currency = record.currency || "VND";
    versionForm.billing_cycle = record.billing_cycle || "YEARLY";
    versionForm.feature_ids = (record.features || []).map((f) => f.id).filter(Boolean) as string[];
    versionForm.quotasJson = record.quotas ? JSON.stringify(record.quotas, null, 2) : "{}";
    versionForm.release_notes = record.release_notes || "";
    versionForm.clone_from_version_id = undefined;
  } else {
    editingVersionId.value = null;
    versionForm.version_label = "";
    versionForm.base_price = 0;
    versionForm.currency = "VND";
    versionForm.billing_cycle = "YEARLY";
    versionForm.feature_ids = [];
    versionForm.quotasJson = "{}";
    versionForm.release_notes = "";
    versionForm.clone_from_version_id = undefined;
  }
  versionOpen.value = true;
};

const submitVersion = async () => {
  try {
    await versionFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const quotas = versionForm.quotasJson.trim() ? JSON.parse(versionForm.quotasJson) : {};
    const commonPayload = {
      version_label: versionForm.version_label.trim(),
      base_price: Number(versionForm.base_price) || 0,
      currency: versionForm.currency,
      billing_cycle: versionForm.billing_cycle,
      feature_ids: versionForm.feature_ids,
      quotas,
      release_notes: versionForm.release_notes.trim() || undefined,
    };

    const { data, error } = editingVersionId.value
      ? await billingApi.updatePackageVersion(editingVersionId.value, commonPayload)
      : await billingApi.createPackageVersion(packageId.value, {
          ...commonPayload,
          clone_from_version_id: versionForm.clone_from_version_id || undefined,
        });

    if (
      handleApiError(
        data,
        error,
        editingVersionId.value ? "Cập nhật phiên bản thất bại!" : "Tạo phiên bản thất bại!",
      )
    ) {
      return;
    }

    message.success(
      (unref(data) as { message?: string } | null)?.message ||
        (editingVersionId.value ? "Cập nhật phiên bản thành công!" : "Tạo phiên bản thành công!"),
    );
    versionOpen.value = false;
    await loadDetail();
  } finally {
    submitting.value = false;
  }
};

const handlePublish = async (record: ServicePackageVersion) => {
  if (!record.id) return;
  const { data, error } = await billingApi.publishPackageVersion(record.id);
  if (handleApiError(data, error, "Phát hành phiên bản thất bại!")) return;
  message.success("Đã phát hành phiên bản!");
  await loadDetail();
};

const handleDeprecate = async (record: ServicePackageVersion) => {
  if (!record.id) return;
  const { data, error } = await billingApi.deprecatePackageVersion(record.id);
  if (handleApiError(data, error, "Ngừng phát hành phiên bản thất bại!")) return;
  message.success("Đã ngừng phát hành phiên bản!");
  await loadDetail();
};

const handleDeleteVersion = async (record: ServicePackageVersion) => {
  if (!record.id) return;
  const { data, error } = await billingApi.deletePackageVersion(record.id);
  if (handleApiError(data, error, "Xóa phiên bản DRAFT thất bại!")) return;
  message.success("Đã xóa phiên bản DRAFT!");
  await loadDetail();
};
</script>
