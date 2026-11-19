<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Danh mục Tính năng (Feature Catalog)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý các tính năng sản phẩm dùng để gắn vào Menu, Quyền và Gói dịch vụ cho Tenant
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchInput"
            placeholder="Tìm theo mã, tên tính năng..."
            allow-clear
            class="w-56"
            @press-enter="applySearch"
            @change="() => !searchInput && applySearch()"
          >
            <template #prefix><Icon name="ant-design:search-outlined" class="text-slate-400" /></template>
          </AInput>

          <AInput
            v-model:value="filters.module"
            placeholder="Lọc theo module..."
            allow-clear
            class="w-40"
          />

          <ASelect
            v-model:value="filters.is_active"
            placeholder="Trạng thái"
            allow-clear
            class="w-36"
            :options="activeFilterOptions"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openModal()">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Thêm tính năng
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="features"
          :loading="pending"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          row-key="id"
          size="middle"
          :scroll="{ x: 900 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-slate-800">{{ record.name || "—" }}</span>
                <ATag v-if="record.is_core" color="purple" class="text-[11px]">Core</ATag>
              </div>
              <div class="font-mono text-xs text-slate-500">{{ record.code }}</div>
            </template>

            <template v-else-if="column.key === 'module'">
              <ATag v-if="record.module" color="blue">{{ record.module }}</ATag>
              <span v-else class="text-xs text-slate-400">—</span>
            </template>

            <template v-else-if="column.key === 'is_active'">
              <ATag :color="record.is_active !== false ? 'success' : 'error'">
                {{ record.is_active !== false ? "Hoạt động" : "Tắt" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <AButton size="small" @click="openModal(record)">
                  <template #icon><Icon name="ant-design:edit-outlined" /></template>
                  Sửa
                </AButton>
                <APopconfirm
                  v-if="record.id && !record.is_core"
                  title="Xóa tính năng này khỏi Catalog?"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeleteFeature(record)"
                >
                  <AButton size="small" danger :loading="deletingId === record.id">
                    <template #icon><Icon name="ant-design:delete-outlined" /></template>
                  </AButton>
                </APopconfirm>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Create / Update -->
    <AModal
      v-model:open="modalOpen"
      :title="editingId ? 'Cập nhật tính năng' : 'Thêm mới tính năng'"
      :confirm-loading="submitting"
      :ok-text="editingId ? 'Lưu thay đổi' : 'Tạo tính năng'"
      cancel-text="Hủy"
      @ok="handleSubmit"
    >
      <AForm ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="mt-3">
        <ARow :gutter="12">
          <ACol :span="12">
            <AFormItem label="Mã tính năng (Code)" name="code">
              <AInput v-model:value="formState.code" placeholder="ACADEMIC_GRADEBOOK" class="font-mono" />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="Module" name="module">
              <AInput v-model:value="formState.module" placeholder="ACADEMIC" />
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem label="Tên tính năng" name="name">
          <AInput v-model:value="formState.name" placeholder="Quản lý Sổ điểm" />
        </AFormItem>

        <AFormItem label="Mô tả" name="description">
          <ATextarea v-model:value="formState.description" :rows="3" placeholder="Mô tả chức năng" />
        </AFormItem>

        <div class="flex gap-6">
          <ACheckbox v-model:checked="formState.is_active">Kích hoạt</ACheckbox>
          <ACheckbox v-model:checked="formState.is_core">Tính năng cốt lõi (Core)</ACheckbox>
        </div>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { useCatalogApi } from "~/composables/api/useCatalogApi";
import type { CatalogFeature, CreateFeatureInput } from "~/types/api/catalog";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Feature Catalog | School ERP",
});

const { catalogFeatures } = useApi();
const catalogApi = useCatalogApi();
const { extractApiData, handleApiError } = useApiError();

const searchInput = ref("");
const filters = reactive({
  search: "",
  module: "",
  is_active: undefined as string | undefined,
});

const queryParams = computed(() => ({
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.module.trim() ? { module: filters.module.trim() } : {}),
  ...(filters.is_active !== undefined ? { is_active: filters.is_active } : {}),
}));

const {
  data: featuresRes,
  pending,
  refresh,
  error: featuresError,
} = await catalogFeatures.get({
  key: "catalog-features-list",
  query: queryParams,
});

watch(
  () => unref(featuresError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh mục tính năng!");
  },
);

const features = computed<CatalogFeature[]>(() => {
  const data = extractApiData(featuresRes);
  return Array.isArray(data) ? data : [];
});

const applySearch = () => {
  filters.search = searchInput.value.trim();
};

const activeFilterOptions = [
  { label: "Đang bật", value: "true" },
  { label: "Đang tắt", value: "false" },
];

const columns: TableProps["columns"] = [
  { title: "Tính năng", key: "name", width: 260 },
  { title: "Module", key: "module", width: 150 },
  { title: "Mô tả", dataIndex: "description", key: "description" },
  { title: "Trạng thái", key: "is_active", width: 120, align: "center" },
  { title: "Thao tác", key: "actions", width: 150, fixed: "right" },
];

// Create / Edit Modal
const modalOpen = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formState = reactive<Required<CreateFeatureInput>>({
  code: "",
  name: "",
  module: "",
  description: "",
  is_active: true,
  is_core: false,
});

const formRules: Record<string, Rule[]> = {
  code: [{ required: true, message: "Vui lòng nhập mã tính năng", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên tính năng", trigger: "blur" }],
  module: [{ required: true, message: "Vui lòng nhập module", trigger: "blur" }],
};

const openModal = (record?: CatalogFeature) => {
  if (record?.id) {
    editingId.value = record.id;
    formState.code = record.code || "";
    formState.name = record.name || "";
    formState.module = record.module || "";
    formState.description = record.description || "";
    formState.is_active = record.is_active ?? true;
    formState.is_core = record.is_core ?? false;
  } else {
    editingId.value = null;
    formState.code = "";
    formState.name = "";
    formState.module = "";
    formState.description = "";
    formState.is_active = true;
    formState.is_core = false;
  }
  modalOpen.value = true;
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload: CreateFeatureInput = {
      code: formState.code.trim(),
      name: formState.name.trim(),
      module: formState.module.trim(),
      description: formState.description.trim() || undefined,
      is_active: formState.is_active,
      is_core: formState.is_core,
    };

    const { data, error } = editingId.value
      ? await catalogApi.updateFeature(editingId.value, payload)
      : await catalogFeatures.post(payload);

    if (handleApiError(data, error, editingId.value ? "Cập nhật tính năng thất bại!" : "Tạo tính năng thất bại!")) {
      return;
    }

    message.success(
      (unref(data) as { message?: string } | null)?.message ||
        (editingId.value ? "Cập nhật tính năng thành công!" : "Tạo tính năng thành công!"),
    );
    modalOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

const deletingId = ref<string | null>(null);
const handleDeleteFeature = async (record: CatalogFeature) => {
  if (!record.id) return;
  deletingId.value = record.id;
  try {
    const { data, error } = await catalogApi.deleteFeature(record.id);
    if (handleApiError(data, error, "Xóa tính năng thất bại!")) return;
    message.success((unref(data) as { message?: string } | null)?.message || "Đã xóa tính năng khỏi Catalog!");
    await refresh();
  } finally {
    deletingId.value = null;
  }
};
</script>
