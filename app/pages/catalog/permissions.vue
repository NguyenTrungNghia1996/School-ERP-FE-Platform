<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Danh mục Quyền Tenant (Permission Catalog)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý các mã quyền chuẩn của hệ thống trường học để gắn vào Menu &amp; Vai trò Tenant
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchQuery"
            placeholder="Lọc nhanh theo mã, tên quyền..."
            allow-clear
            class="w-56"
          >
            <template #prefix><Icon name="ant-design:search-outlined" class="text-slate-400" /></template>
          </AInput>

          <ASelect
            v-model:value="filters.feature_id"
            placeholder="Tính năng (Feature)"
            allow-clear
            show-search
            option-filter-prop="label"
            class="w-48"
            :options="featureOptions"
          />

          <AInput
            v-model:value="filters.resource"
            placeholder="Resource..."
            allow-clear
            class="w-36"
          />

          <ASelect
            v-model:value="filters.is_sensitive"
            placeholder="Mức độ"
            allow-clear
            class="w-36"
            :options="sensitiveFilterOptions"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openModal()">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Thêm quyền
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="displayedPermissions"
          :loading="pending"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1000 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-slate-800">{{ record.name || "—" }}</span>
                <ATag v-if="record.is_sensitive" color="red" class="text-[11px]">Nhạy cảm</ATag>
              </div>
              <div class="font-mono text-xs text-slate-500">{{ record.code }}</div>
            </template>

            <template v-else-if="column.key === 'resource_action'">
              <ASpace size="small">
                <ATag color="blue" class="font-mono text-[11px]">{{ record.resource || "—" }}</ATag>
                <ATag color="cyan" class="font-mono text-[11px]">{{ record.action || "—" }}</ATag>
              </ASpace>
            </template>

            <template v-else-if="column.key === 'feature'">
              <ATag v-if="record.feature?.code || record.feature?.name" color="geekblue">
                {{ record.feature?.name || record.feature?.code }}
              </ATag>
              <span v-else class="text-xs text-slate-400">—</span>
            </template>

            <template v-else-if="column.key === 'is_active'">
              <ATag :color="record.is_active !== false ? 'success' : 'error'">
                {{ record.is_active !== false ? "Hoạt động" : "Tắt" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <AButton size="small" @click="openModal(record)">
                <template #icon><Icon name="ant-design:edit-outlined" /></template>
                Sửa
              </AButton>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Create / Update -->
    <AModal
      v-model:open="modalOpen"
      :title="editingId ? 'Cập nhật quyền Tenant' : 'Thêm mới quyền Tenant'"
      :confirm-loading="submitting"
      :ok-text="editingId ? 'Lưu thay đổi' : 'Tạo quyền'"
      cancel-text="Hủy"
      @ok="handleSubmit"
    >
      <AForm ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="mt-3">
        <AFormItem label="Mã quyền (Code)" name="code">
          <AInput v-model:value="formState.code" placeholder="student.profile.read" class="font-mono" />
        </AFormItem>

        <AFormItem label="Tên quyền" name="name">
          <AInput v-model:value="formState.name" placeholder="Xem hồ sơ học sinh" />
        </AFormItem>

        <template v-if="!editingId">
          <ARow :gutter="12">
            <ACol :span="12">
              <AFormItem label="Resource" name="resource">
                <AInput v-model:value="formState.resource" placeholder="student.profile" class="font-mono" />
              </AFormItem>
            </ACol>
            <ACol :span="12">
              <AFormItem label="Action" name="action">
                <AInput v-model:value="formState.action" placeholder="read" class="font-mono" />
              </AFormItem>
            </ACol>
          </ARow>

          <AFormItem label="Thuộc tính năng (Feature)" name="feature_id">
            <ASelect
              v-model:value="formState.feature_id"
              placeholder="Chọn Feature"
              allow-clear
              show-search
              option-filter-prop="label"
              :options="featureOptions"
            />
          </AFormItem>
        </template>

        <AFormItem label="Mô tả" name="description">
          <ATextarea v-model:value="formState.description" :rows="3" placeholder="Mô tả phạm vi quyền" />
        </AFormItem>

        <div class="flex gap-6">
          <ACheckbox v-model:checked="formState.is_active">Kích hoạt</ACheckbox>
          <ACheckbox v-model:checked="formState.is_sensitive">Quyền nhạy cảm</ACheckbox>
        </div>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { useCatalogApi } from "~/composables/api/useCatalogApi";
import type {
  CatalogFeature,
  CreatePermissionInput,
  TenantPermission,
  UpdatePermissionInput,
} from "~/types/api/catalog";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Permission Catalog | School ERP",
});

const { catalogPermissions, catalogFeatures } = useApi();
const catalogApi = useCatalogApi();
const { extractApiData, handleApiError } = useApiError();

const searchQuery = ref("");
const filters = reactive({
  feature_id: undefined as string | undefined,
  resource: "",
  is_sensitive: undefined as string | undefined,
});

const queryParams = computed(() => ({
  ...(filters.feature_id ? { feature_id: filters.feature_id } : {}),
  ...(filters.resource.trim() ? { resource: filters.resource.trim() } : {}),
  ...(filters.is_sensitive !== undefined ? { is_sensitive: filters.is_sensitive } : {}),
}));

const {
  data: permsRes,
  pending,
  refresh,
  error: permsError,
} = await catalogPermissions.get({
  key: "catalog-permissions-list",
  query: queryParams,
});

watch(
  () => unref(permsError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh mục quyền Tenant!");
  },
);

const { data: featuresRes } = await catalogFeatures.get({
  key: "catalog-features-options",
});

const featureOptions = computed(() => {
  const list = extractApiData(featuresRes);
  if (!Array.isArray(list)) return [];
  return (list as CatalogFeature[]).map((f) => ({
    label: `${f.name || f.code} (${f.code || ""})`,
    value: f.id || "",
  }));
});

const rawPermissions = computed<TenantPermission[]>(() => {
  const data = extractApiData(permsRes);
  return Array.isArray(data) ? data : [];
});

const displayedPermissions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rawPermissions.value;
  return rawPermissions.value.filter(
    (p) =>
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.resource?.toLowerCase().includes(q) ||
      p.action?.toLowerCase().includes(q),
  );
});

const sensitiveFilterOptions = [
  { label: "Nhạy cảm", value: "true" },
  { label: "Thông thường", value: "false" },
];

const columns: TableProps["columns"] = [
  { title: "Quyền hạn", key: "name", width: 260 },
  { title: "Resource / Action", key: "resource_action", width: 210 },
  { title: "Tính năng", key: "feature", width: 180 },
  { title: "Mô tả", dataIndex: "description", key: "description" },
  { title: "Trạng thái", key: "is_active", width: 120, align: "center" },
  { title: "Thao tác", key: "actions", width: 100, fixed: "right" },
];

// Modal Create / Edit
const modalOpen = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formState = reactive({
  code: "",
  name: "",
  resource: "",
  action: "",
  feature_id: undefined as string | undefined,
  description: "",
  is_active: true,
  is_sensitive: false,
});

const formRules: Record<string, Rule[]> = {
  code: [{ required: true, message: "Vui lòng nhập mã quyền", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên quyền", trigger: "blur" }],
  resource: [{ required: true, message: "Vui lòng nhập resource", trigger: "blur" }],
  action: [{ required: true, message: "Vui lòng nhập action", trigger: "blur" }],
};

const openModal = (record?: TenantPermission) => {
  if (record?.id) {
    editingId.value = record.id;
    formState.code = record.code || "";
    formState.name = record.name || "";
    formState.resource = record.resource || "";
    formState.action = record.action || "";
    formState.feature_id = record.feature_id;
    formState.description = record.description || "";
    formState.is_active = record.is_active ?? true;
    formState.is_sensitive = record.is_sensitive ?? false;
  } else {
    editingId.value = null;
    formState.code = "";
    formState.name = "";
    formState.resource = "";
    formState.action = "";
    formState.feature_id = undefined;
    formState.description = "";
    formState.is_active = true;
    formState.is_sensitive = false;
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
    let result;
    if (editingId.value) {
      const payload: UpdatePermissionInput = {
        code: formState.code.trim(),
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        is_active: formState.is_active,
        is_sensitive: formState.is_sensitive,
      };
      result = await catalogApi.updatePermission(editingId.value, payload);
    } else {
      const payload: CreatePermissionInput = {
        code: formState.code.trim(),
        name: formState.name.trim(),
        resource: formState.resource.trim(),
        action: formState.action.trim(),
        feature_id: formState.feature_id || undefined,
        description: formState.description.trim() || undefined,
        is_active: formState.is_active,
        is_sensitive: formState.is_sensitive,
      };
      result = await catalogPermissions.post(payload);
    }

    if (
      handleApiError(
        result.data,
        result.error,
        editingId.value ? "Cập nhật quyền thất bại!" : "Tạo quyền thất bại!",
      )
    ) {
      return;
    }

    message.success(
      (unref(result.data) as { message?: string } | null)?.message ||
        (editingId.value ? "Cập nhật quyền thành công!" : "Tạo quyền thành công!"),
    );
    modalOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
