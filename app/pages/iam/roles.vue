<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Vai trò &amp; Phân quyền Nền tảng (IAM)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý vai trò quản trị Platform, xem chi tiết nhân sự áp dụng và cấu hình ma trận quyền theo module
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchQuery"
            placeholder="Tìm theo tên hoặc mã vai trò..."
            allow-clear
            class="w-64"
          >
            <template #prefix>
              <Icon name="ant-design:search-outlined" class="text-slate-400" />
            </template>
          </AInput>

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateDrawer">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Thêm vai trò
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Roles Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="filteredRoles"
          :loading="pending"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          row-key="id"
          size="middle"
          :scroll="{ x: 960 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-slate-800">{{ record.name || "—" }}</span>
                <ATag v-if="record.is_system" color="purple" class="text-[11px]">Hệ thống</ATag>
              </div>
              <div class="font-mono text-xs text-slate-500">{{ record.code }}</div>
            </template>

            <template v-else-if="column.key === 'user_count'">
              <ATag color="blue">{{ record.user_count ?? 0 }} nhân sự</ATag>
            </template>

            <template v-else-if="column.key === 'perm_count'">
              <ATag color="green">
                {{ record.permission_count ?? record.permission_codes?.length ?? record.permissions?.length ?? 0 }} quyền
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <ATooltip title="Xem chi tiết">
                  <AButton size="small" @click="openDetailDrawer(record)">
                    <template #icon><Icon name="ant-design:eye-outlined" /></template>
                  </AButton>
                </ATooltip>

                <AButton size="small" type="primary" ghost @click="openEditDrawer(record)">
                  <template #icon><Icon name="ant-design:edit-outlined" /></template>
                  Sửa &amp; Phân quyền
                </AButton>

                <APopconfirm
                  v-if="!record.is_system"
                  title="Xóa vai trò tùy chỉnh này?"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeleteRole(record)"
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

    <!-- Drawer Chi tiết Vai trò (GET /v1/platform/iam/roles/{id}) -->
    <ADrawer
      v-model:open="detailOpen"
      :title="`Chi tiết vai trò — ${roleDetail?.name || roleDetail?.code || ''}`"
      :size="640"
    >
      <ASpin :spinning="loadingDetail">
        <div v-if="roleDetail" class="space-y-5">
          <ADescriptions :column="1" bordered size="small" :items="detailDescriptionItems" />

          <div>
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Danh sách quyền ({{ roleDetail.permissions?.length ?? roleDetail.permission_ids?.length ?? 0 }})
            </div>
            <div v-if="roleDetail.permissions?.length" class="flex flex-wrap gap-1.5">
              <ATag v-for="p in roleDetail.permissions" :key="p.id || p.code" color="green">
                {{ p.name || p.code }}
              </ATag>
            </div>
            <AEmpty v-else description="Vai trò chưa được gán quyền nào" />
          </div>

          <div>
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nhân sự thuộc vai trò ({{ roleDetail.users?.length ?? roleDetail.user_count ?? 0 }})
            </div>
            <div v-if="roleDetail.users?.length" class="space-y-2">
              <div
                v-for="u in roleDetail.users"
                :key="u.id || u.email"
                class="flex items-center justify-between rounded-lg border border-slate-200/80 p-2.5"
              >
                <div>
                  <div class="text-sm font-medium text-slate-800">{{ u.full_name || "—" }}</div>
                  <div class="text-xs text-slate-500">{{ u.email }}</div>
                </div>
                <ATag :color="u.status === 'ACTIVE' ? 'success' : 'default'">{{ u.status || "—" }}</ATag>
              </div>
            </div>
            <AEmpty v-else description="Chưa có nhân sự nào được gán vai trò này" />
          </div>
        </div>
      </ASpin>
    </ADrawer>

    <!-- Drawer Tạo mới / Chỉnh sửa & Phân quyền Vai trò -->
    <ADrawer
      v-model:open="roleDrawerOpen"
      :title="drawerMode === 'create' ? 'Tạo mới vai trò nền tảng' : `Chỉnh sửa vai trò — ${editingRole?.name || editingRole?.code || ''}`"
      :size="720"
    >
      <ASpin :spinning="loadingDrawer">
        <AForm ref="roleFormRef" :model="roleForm" :rules="roleRules" layout="vertical" class="space-y-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AFormItem label="Mã vai trò (Code)" name="code" class="!mb-0">
              <AInput
                v-model:value="roleForm.code"
                placeholder="SUPPORT_AGENT"
                class="font-mono"
                :disabled="drawerMode === 'edit' && Boolean(editingRole?.is_system)"
              />
            </AFormItem>
            <AFormItem label="Tên vai trò" name="name" class="!mb-0">
              <AInput v-model:value="roleForm.name" placeholder="Chuyên viên Hỗ trợ" />
            </AFormItem>
          </div>

          <AFormItem label="Mô tả" name="description" class="!mb-0">
            <ATextarea v-model:value="roleForm.description" :rows="2" placeholder="Hỗ trợ vận hành các trường học" />
          </AFormItem>

          <ADivider title-placement="left" class="!my-3">
            Ma trận phân quyền theo Module
          </ADivider>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <AInput
              v-model:value="permSearch"
              placeholder="Tìm theo tên quyền, mã quyền, module..."
              allow-clear
              class="flex-1"
            >
              <template #prefix>
                <Icon name="ant-design:search-outlined" class="text-slate-400" />
              </template>
            </AInput>
            <ATag color="blue">Đã chọn: {{ roleForm.permission_ids.length }} / {{ totalPermissionsCount }}</ATag>
          </div>

          <div v-if="filteredPermissionGroups.length" class="space-y-3">
            <div
              v-for="group in filteredPermissionGroups"
              :key="group.module"
              class="rounded-xl border border-slate-200/80 p-3"
            >
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span class="font-semibold text-slate-800">{{ group.module_label || group.module }}</span>
                  <span v-if="group.module_label && group.module" class="ml-2 font-mono text-xs text-slate-400">
                    {{ group.module }}
                  </span>
                </div>
                <ACheckbox
                  :checked="isGroupAllChecked(group.permissions || [])"
                  :indeterminate="isGroupIndeterminate(group.permissions || [])"
                  @change="(e: any) => toggleGroup(group.permissions || [], e.target.checked)"
                >
                  Chọn tất cả ({{ (group.permissions || []).length }})
                </ACheckbox>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  v-for="perm in group.permissions || []"
                  :key="perm.id || perm.code"
                  class="rounded-lg border border-slate-100 bg-slate-50/70 p-2"
                >
                  <ACheckbox
                    :checked="Boolean(perm.id && roleForm.permission_ids.includes(perm.id))"
                    @change="(e: any) => perm.id && togglePermission(perm.id, e.target.checked)"
                  >
                    <div class="text-xs font-medium text-slate-800">{{ perm.name || perm.code }}</div>
                    <div class="font-mono text-[11px] text-slate-500">{{ perm.code }}</div>
                    <div v-if="perm.description" class="text-[11px] text-slate-400">{{ perm.description }}</div>
                  </ACheckbox>
                </div>
              </div>
            </div>
          </div>
          <AEmpty v-else description="Không tìm thấy quyền phù hợp" />
        </AForm>
      </ASpin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <AButton @click="roleDrawerOpen = false">Hủy</AButton>
          <AButton type="primary" :loading="submitting" @click="submitRoleDrawer">
            {{ drawerMode === "create" ? "Tạo vai trò" : "Lưu cập nhật" }}
          </AButton>
        </div>
      </template>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { usePlatformIamApi } from "~/composables/api/usePlatformIamApi";
import type {
  PermissionItem,
  PermissionModuleGroup,
  RoleDetailOutput,
  RoleWithSummary,
} from "~/types/api/iam";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Vai trò & Phân quyền (IAM) | School ERP",
});

const { platformIamRoles, platformIamPermissions } = useApi();
const iamApi = usePlatformIamApi();
const { extractApiData, handleApiError } = useApiError();

const {
  data: rolesRes,
  pending,
  refresh,
  error: rolesError,
} = await platformIamRoles.get({
  key: "iam-roles-list",
});

watch(
  () => unref(rolesError),
  (err) => err && handleApiError(null, err, "Không thể tải danh sách vai trò!"),
);

const searchQuery = ref("");
const roles = computed<RoleWithSummary[]>(() => (extractApiData(rolesRes) as RoleWithSummary[]) ?? []);
const filteredRoles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return roles.value;
  return roles.value.filter(
    (r) =>
      r.name?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q),
  );
});

const columns: TableProps["columns"] = [
  { title: "Vai trò", key: "name", width: 240 },
  { title: "Mô tả", dataIndex: "description", key: "description", ellipsis: true },
  { title: "Số nhân sự", key: "user_count", width: 130 },
  { title: "Số quyền", key: "perm_count", width: 120 },
  { title: "Thao tác", key: "actions", width: 260, fixed: "right" as const },
];

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString("vi-VN");
};

// --- Ma trận quyền (GET /v1/platform/iam/permissions) ---
const permissionGroups = ref<PermissionModuleGroup[]>([]);
const permSearch = ref("");

const loadPermissionMatrix = async () => {
  if (permissionGroups.value.length) return;
  const { data, error } = await platformIamPermissions.getClient();
  if (handleApiError(data, error, "Không thể tải danh sách ma trận quyền!")) return;
  permissionGroups.value = (extractApiData(data) as PermissionModuleGroup[]) ?? [];
};

const totalPermissionsCount = computed(() =>
  permissionGroups.value.reduce((sum, g) => sum + (g.permissions?.length ?? 0), 0),
);

const filteredPermissionGroups = computed<PermissionModuleGroup[]>(() => {
  const q = permSearch.value.trim().toLowerCase();
  if (!q) return permissionGroups.value;
  return permissionGroups.value
    .map((group) => {
      const moduleMatch =
        group.module?.toLowerCase().includes(q) || group.module_label?.toLowerCase().includes(q);
      if (moduleMatch) return group;
      const matchedPerms = (group.permissions || []).filter(
        (p) =>
          p.code?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
      return matchedPerms.length ? { ...group, permissions: matchedPerms } : null;
    })
    .filter(Boolean) as PermissionModuleGroup[];
});

// --- Chi tiết vai trò (GET /v1/platform/iam/roles/{id}) ---
const detailOpen = ref(false);
const loadingDetail = ref(false);
const roleDetail = ref<RoleDetailOutput | null>(null);

const detailDescriptionItems = computed(() => {
  const r = roleDetail.value;
  if (!r) return [];
  return [
    { key: "code", label: "Mã vai trò", content: r.code || "—" },
    { key: "name", label: "Tên vai trò", content: r.name || "—" },
    { key: "description", label: "Mô tả", content: r.description || "—" },
    { key: "is_system", label: "Loại vai trò", content: r.is_system ? "Vai trò hệ thống" : "Vai trò tùy chỉnh" },
    { key: "created_at", label: "Ngày tạo", content: formatDateTime(r.created_at) },
    { key: "updated_at", label: "Cập nhật gần nhất", content: formatDateTime(r.updated_at) },
  ];
});

const openDetailDrawer = async (record: RoleWithSummary) => {
  roleDetail.value = {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    is_system: record.is_system,
    permissions: record.permissions,
    user_count: record.user_count,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
  detailOpen.value = true;
  if (!record.id) return;

  loadingDetail.value = true;
  try {
    const { data, error } = await iamApi.getIamRole(record.id);
    if (handleApiError(data, error, "Không thể tải chi tiết vai trò!")) return;
    const detail = extractApiData(data) as RoleDetailOutput | null;
    if (detail) roleDetail.value = detail;
  } finally {
    loadingDetail.value = false;
  }
};

// --- Drawer Tạo mới / Sửa & Phân quyền ---
const roleDrawerOpen = ref(false);
const drawerMode = ref<"create" | "edit">("create");
const loadingDrawer = ref(false);
const submitting = ref(false);
const editingRole = ref<RoleWithSummary | null>(null);
const roleFormRef = ref<FormInstance>();

const roleForm = reactive({
  code: "",
  name: "",
  description: "",
  permission_ids: [] as string[],
});

const roleRules: Record<string, Rule[]> = {
  code: [{ required: true, message: "Vui lòng nhập mã vai trò", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên vai trò", trigger: "blur" }],
};

const openCreateDrawer = async () => {
  drawerMode.value = "create";
  editingRole.value = null;
  permSearch.value = "";
  roleForm.code = "";
  roleForm.name = "";
  roleForm.description = "";
  roleForm.permission_ids = [];
  roleDrawerOpen.value = true;

  loadingDrawer.value = true;
  try {
    await loadPermissionMatrix();
  } finally {
    loadingDrawer.value = false;
  }
};

const openEditDrawer = async (record: RoleWithSummary) => {
  drawerMode.value = "edit";
  editingRole.value = record;
  permSearch.value = "";
  roleForm.code = record.code || "";
  roleForm.name = record.name || "";
  roleForm.description = record.description || "";
  roleForm.permission_ids = (record.permissions || []).map((p) => p.id).filter(Boolean) as string[];
  roleDrawerOpen.value = true;

  loadingDrawer.value = true;
  try {
    const [detailRes] = await Promise.all([
      record.id ? iamApi.getIamRole(record.id) : Promise.resolve(null),
      loadPermissionMatrix(),
    ]);
    if (detailRes) {
      if (handleApiError(detailRes.data, detailRes.error, "Không thể tải chi tiết vai trò!")) return;
      const detail = extractApiData(detailRes.data) as RoleDetailOutput | null;
      if (detail) {
        roleForm.code = detail.code || roleForm.code;
        roleForm.name = detail.name || roleForm.name;
        roleForm.description = detail.description || "";
        roleForm.permission_ids =
          detail.permission_ids ??
          ((detail.permissions || []).map((p) => p.id).filter(Boolean) as string[]);
      }
    }
  } finally {
    loadingDrawer.value = false;
  }
};

const togglePermission = (id: string, checked: boolean) => {
  if (!id) return;
  if (checked) {
    if (!roleForm.permission_ids.includes(id)) roleForm.permission_ids.push(id);
  } else {
    roleForm.permission_ids = roleForm.permission_ids.filter((item) => item !== id);
  }
};

const isGroupAllChecked = (items: PermissionItem[]) => {
  const ids = items.map((i) => i.id).filter(Boolean) as string[];
  return ids.length > 0 && ids.every((id) => roleForm.permission_ids.includes(id));
};

const isGroupIndeterminate = (items: PermissionItem[]) => {
  const ids = items.map((i) => i.id).filter(Boolean) as string[];
  const checkedCount = ids.filter((id) => roleForm.permission_ids.includes(id)).length;
  return checkedCount > 0 && checkedCount < ids.length;
};

const toggleGroup = (items: PermissionItem[], checked: boolean) => {
  const ids = items.map((i) => i.id).filter(Boolean) as string[];
  if (checked) {
    roleForm.permission_ids = Array.from(new Set([...roleForm.permission_ids, ...ids]));
  } else {
    const removeSet = new Set(ids);
    roleForm.permission_ids = roleForm.permission_ids.filter((id) => !removeSet.has(id));
  }
};

const submitRoleDrawer = async () => {
  await roleFormRef.value?.validate();
  submitting.value = true;
  try {
    if (drawerMode.value === "create") {
      const { data, error } = await platformIamRoles.post({
        code: roleForm.code.trim().toUpperCase(),
        name: roleForm.name.trim(),
        ...(roleForm.description.trim() ? { description: roleForm.description.trim() } : {}),
        permission_ids: roleForm.permission_ids,
      });
      if (handleApiError(data, error, "Tạo vai trò thất bại!")) return;
      message.success(unref(data)?.message || "Tạo vai trò thành công!");
    } else if (editingRole.value?.id) {
      const { data, error } = await iamApi.updateIamRole(editingRole.value.id, {
        code: roleForm.code.trim().toUpperCase(),
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        permission_ids: roleForm.permission_ids,
      });
      if (handleApiError(data, error, "Cập nhật vai trò thất bại!")) return;
      message.success(unref(data)?.message || "Đã cập nhật vai trò và ma trận quyền!");
    }
    roleDrawerOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// --- Xóa vai trò tùy chỉnh (DELETE /v1/platform/iam/roles/{id}) ---
const deletingId = ref<string | null>(null);
const handleDeleteRole = async (record: RoleWithSummary) => {
  if (!record.id) return;
  deletingId.value = record.id;
  try {
    const { data, error } = await iamApi.deleteIamRole(record.id);
    if (handleApiError(data, error, "Xóa vai trò thất bại!")) return;
    message.success(unref(data)?.message || "Đã xóa vai trò!");
    await refresh();
  } finally {
    deletingId.value = null;
  }
};
</script>
