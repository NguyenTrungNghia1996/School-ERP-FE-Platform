<template>
  <div class="space-y-4">
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Quản lý Gói dịch vụ (Service Packages)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Thiết lập gói chính (PRIMARY), gói bổ sung (ADDON) và theo dõi phiên bản phát hành
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchQuery"
            placeholder="Tìm theo mã hoặc tên gói..."
            allow-clear
            class="w-56"
          >
            <template #prefix><Icon name="ant-design:search-outlined" class="text-slate-400" /></template>
          </AInput>

          <ASelect
            v-model:value="packageTypeFilter"
            placeholder="Loại gói"
            allow-clear
            class="w-36"
            :options="packageTypeOptions"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateModal">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Tạo gói dịch vụ
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="filteredPackages"
          :loading="pending"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          row-key="id"
          size="middle"
          :scroll="{ x: 960 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="cursor-pointer font-semibold text-blue-600 hover:underline"
                  @click="navigateTo(`/packages/${record.id}`)"
                >
                  {{ record.name || "—" }}
                </span>
                <ATag v-if="record.is_public" color="cyan" class="text-[11px]">Công khai</ATag>
              </div>
              <div class="font-mono text-xs text-slate-500">{{ record.code }}</div>
            </template>

            <template v-else-if="column.key === 'package_type'">
              <ATag :color="record.package_type === 'PRIMARY' ? 'blue' : 'purple'">
                {{ record.package_type || "—" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'latest_version'">
              <div v-if="record.latest_published_version">
                <ATag color="green">
                  v{{ record.latest_published_version.version_number ?? 1 }}
                  {{ record.latest_published_version.version_label ? `- ${record.latest_published_version.version_label}` : "" }}
                </ATag>
                <div class="mt-0.5 text-xs text-slate-500">
                  {{ formatPrice(record.latest_published_version.base_price, record.latest_published_version.currency) }}
                  / {{ record.latest_published_version.billing_cycle || "—" }}
                </div>
              </div>
              <span v-else class="text-xs text-slate-400">Chưa phát hành</span>
            </template>

            <template v-else-if="column.key === 'active_org_count'">
              <ATag color="geekblue">{{ record.active_org_count ?? 0 }} tổ chức</ATag>
            </template>

            <template v-else-if="column.key === 'is_active'">
              <ATag :color="record.is_active !== false ? 'success' : 'error'">
                {{ record.is_active !== false ? "Hoạt động" : "Tắt" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <AButton size="small" type="primary" ghost @click="navigateTo(`/packages/${record.id}`)">
                  <template #icon><Icon name="ant-design:eye-outlined" /></template>
                  Phiên bản
                </AButton>
                <AButton size="small" @click="openEditModal(record)">
                  <template #icon><Icon name="ant-design:edit-outlined" /></template>
                </AButton>
                <APopconfirm
                  v-if="record.id"
                  title="Xóa gói dịch vụ này? (Chỉ xóa được khi chưa có phiên bản PUBLISHED hoặc Tổ chức đăng ký)"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeletePackage(record)"
                >
                  <AButton size="small" danger :loading="deletingPackageId === record.id">
                    <template #icon><Icon name="ant-design:delete-outlined" /></template>
                  </AButton>
                </APopconfirm>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Tạo mới / Cập nhật gói -->
    <AModal
      v-model:open="createOpen"
      :title="editingPackageId ? 'Cập nhật gói dịch vụ' : 'Tạo mới gói dịch vụ'"
      :confirm-loading="submitting"
      :ok-text="editingPackageId ? 'Lưu thay đổi' : 'Tạo gói'"
      cancel-text="Hủy"
      @ok="submitCreate"
    >
      <AForm ref="formRef" :model="createForm" :rules="formRules" layout="vertical" class="mt-3">
        <ARow :gutter="12">
          <ACol :span="12">
            <AFormItem label="Mã gói (Code)" name="code">
              <AInput
                v-model:value="createForm.code"
                placeholder="STANDARD_SCHOOL"
                class="font-mono"
                :disabled="Boolean(editingPackageId)"
              />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="Loại gói" name="package_type">
              <ASelect
                v-model:value="createForm.package_type"
                :options="packageTypeOptions"
                :disabled="Boolean(editingPackageId)"
              />
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem label="Tên gói dịch vụ" name="name">
          <AInput v-model:value="createForm.name" placeholder="Gói Tiêu Chuẩn" />
        </AFormItem>

        <AFormItem label="Mô tả" name="description">
          <ATextarea v-model:value="createForm.description" :rows="3" placeholder="Mô tả gói dịch vụ" />
        </AFormItem>

        <div class="flex gap-6">
          <ACheckbox v-model:checked="createForm.is_active">Kích hoạt</ACheckbox>
          <ACheckbox v-model:checked="createForm.is_public">Hiển thị công khai</ACheckbox>
        </div>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { useBillingApi } from "~/composables/api/useBillingApi";
import type { CreatePackageInput, ServicePackageWithSummary } from "~/types/api/billing";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Gói dịch vụ | School ERP",
});

const { platformPackages } = useApi();
const billingApi = useBillingApi();
const { extractApiData, handleApiError } = useApiError();

const searchQuery = ref("");
const packageTypeFilter = ref<string | undefined>(undefined);

const queryParams = computed(() => ({
  ...(packageTypeFilter.value ? { package_type: packageTypeFilter.value } : {}),
}));

const {
  data: packagesRes,
  pending,
  refresh,
  error: packagesError,
} = await platformPackages.get({
  key: "platform-packages-list",
  query: queryParams,
});

watch(
  () => unref(packagesError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách gói dịch vụ!");
  },
);

const rawPackages = computed<ServicePackageWithSummary[]>(() => {
  const data = extractApiData(packagesRes);
  return Array.isArray(data) ? data : [];
});

const filteredPackages = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rawPackages.value;
  return rawPackages.value.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q),
  );
});

const packageTypeOptions = [
  { label: "PRIMARY", value: "PRIMARY" },
  { label: "ADDON", value: "ADDON" },
];

const formatPrice = (price?: number, currency = "VND") => {
  if (price === undefined || price === null) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(price)} ${currency}`;
};

const columns: TableProps["columns"] = [
  { title: "Gói dịch vụ", key: "name", width: 240 },
  { title: "Loại", key: "package_type", width: 120, align: "center" },
  { title: "Phiên bản phát hành mới nhất", key: "latest_version", width: 230 },
  { title: "Đang sử dụng", key: "active_org_count", width: 140, align: "center" },
  { title: "Trạng thái", key: "is_active", width: 120, align: "center" },
  { title: "Thao tác", key: "actions", width: 200, fixed: "right" },
];

// Create / Edit modal
const createOpen = ref(false);
const editingPackageId = ref<string | null>(null);
const deletingPackageId = ref<string | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const createForm = reactive<Required<CreatePackageInput>>({
  code: "",
  name: "",
  package_type: "PRIMARY",
  description: "",
  is_active: true,
  is_public: true,
});

const formRules: Record<string, Rule[]> = {
  code: [{ required: true, message: "Vui lòng nhập mã gói", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên gói", trigger: "blur" }],
  package_type: [{ required: true, message: "Vui lòng chọn loại gói", trigger: "change" }],
};

const openCreateModal = () => {
  editingPackageId.value = null;
  createForm.code = "";
  createForm.name = "";
  createForm.package_type = "PRIMARY";
  createForm.description = "";
  createForm.is_active = true;
  createForm.is_public = true;
  createOpen.value = true;
};

const openEditModal = (record: ServicePackageWithSummary) => {
  if (!record.id) return;
  editingPackageId.value = record.id;
  createForm.code = record.code || "";
  createForm.name = record.name || "";
  createForm.package_type = record.package_type || "PRIMARY";
  createForm.description = record.description || "";
  createForm.is_active = record.is_active ?? true;
  createForm.is_public = record.is_public ?? true;
  createOpen.value = true;
};

const submitCreate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const { data, error } = editingPackageId.value
      ? await billingApi.updatePackage(editingPackageId.value, {
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          is_active: createForm.is_active,
          is_public: createForm.is_public,
        })
      : await platformPackages.post({
          code: createForm.code.trim(),
          name: createForm.name.trim(),
          package_type: createForm.package_type,
          description: createForm.description.trim() || undefined,
          is_active: createForm.is_active,
          is_public: createForm.is_public,
        });

    if (handleApiError(data, error, editingPackageId.value ? "Cập nhật gói dịch vụ thất bại!" : "Tạo gói dịch vụ thất bại!")) {
      return;
    }

    message.success(
      (unref(data) as { message?: string } | null)?.message ||
        (editingPackageId.value ? "Cập nhật gói dịch vụ thành công!" : "Tạo gói dịch vụ thành công!"),
    );
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

const handleDeletePackage = async (record: ServicePackageWithSummary) => {
  if (!record.id) return;
  deletingPackageId.value = record.id;
  try {
    const { data, error } = await billingApi.deletePackage(record.id);
    if (handleApiError(data, error, "Xóa gói dịch vụ thất bại!")) return;
    message.success((unref(data) as { message?: string } | null)?.message || "Đã xóa gói dịch vụ!");
    await refresh();
  } finally {
    deletingPackageId.value = null;
  }
};
</script>
