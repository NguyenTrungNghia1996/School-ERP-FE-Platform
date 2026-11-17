<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Vai trò &amp; Phân quyền Nền tảng
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý các vai trò quản trị Platform và cấu hình ma trận quyền hạn chi tiết
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

          <AButton type="primary" @click="openCreateModal">
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
          :scroll="{ x: 900 }"
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
                {{ record.permission_codes?.length ?? record.permissions?.length ?? 0 }} quyền
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <AButton size="small" type="primary" ghost @click="openPermDrawer(record)">
                <template #icon><Icon name="ant-design:safety-certificate-outlined" /></template>
                Phân quyền
              </AButton>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Tạo mới vai trò -->
    <AModal
      v-model:open="createOpen"
      title="Tạo mới vai trò nền tảng"
      :confirm-loading="submitting"
      ok-text="Tạo vai trò"
      cancel-text="Hủy"
      @ok="submitCreate"
    >
      <AForm ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical" class="mt-3">
        <AFormItem label="Mã vai trò (Code)" name="code">
          <AInput v-model:value="createForm.code" placeholder="SUPPORT_ADMIN" class="font-mono" />
        </AFormItem>
        <AFormItem label="Tên vai trò" name="name">
          <AInput v-model:value="createForm.name" placeholder="Quản trị hỗ trợ" />
        </AFormItem>
        <AFormItem label="Mô tả" name="description">
          <ATextarea v-model:value="createForm.description" :rows="3" placeholder="Mô tả phạm vi trách nhiệm" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Drawer Phân quyền cho vai trò -->
    <ADrawer
      v-model:open="permDrawerOpen"
      :title="`Cấu hình quyền — ${selectedRole?.name || selectedRole?.code || ''}`"
      :width="680"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <AInput
            v-model:value="permSearch"
            placeholder="Tìm theo mã quyền, tên quyền, module..."
            allow-clear
            class="flex-1"
          >
            <template #prefix>
              <Icon name="ant-design:search-outlined" class="text-slate-400" />
            </template>
          </AInput>
          <ATag color="blue">Đã chọn: {{ checkedCodes.length }} / {{ allPermissions.length }}</ATag>
        </div>

        <ASpin :spinning="loadingPerms">
          <div v-if="groupedPermissions.length" class="space-y-3">
            <div
              v-for="group in groupedPermissions"
              :key="group.module"
              class="rounded-xl border border-slate-200/80 p-3"
            >
              <div class="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-semibold text-slate-800">{{ group.module }}</span>
                <ACheckbox
                  :checked="isGroupAllChecked(group.items)"
                  :indeterminate="isGroupIndeterminate(group.items)"
                  @change="(e: any) => toggleGroup(group.items, e.target.checked)"
                >
                  Chọn tất cả ({{ group.items.length }})
                </ACheckbox>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  v-for="perm in group.items"
                  :key="perm.code || perm.id"
                  class="rounded-lg border border-slate-100 bg-slate-50/70 p-2"
                >
                  <ACheckbox
                    :checked="checkedCodes.includes(perm.code || '')"
                    @change="(e: any) => togglePermission(perm.code || '', e.target.checked)"
                  >
                    <div class="text-xs font-medium text-slate-800">{{ perm.name || perm.code }}</div>
                    <div class="font-mono text-[11px] text-slate-500">{{ perm.code }}</div>
                  </ACheckbox>
                </div>
              </div>
            </div>
          </div>
          <AEmpty v-else description="Không tìm thấy quyền phù hợp" />
        </ASpin>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <AButton @click="permDrawerOpen = false">Hủy</AButton>
          <AButton type="primary" :loading="submitting" @click="submitPermissions">
            Lưu phân quyền
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
import type { CreateRoleInput, PlatformPermission, RoleWithSummary } from "~/types/api/iam";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Vai trò & Phân quyền | School ERP",
});

const { platformRoles, platformPermissions } = useApi();
const iamApi = usePlatformIamApi();
const { extractApiData, handleApiError } = useApiError();

const {
  data: rolesRes,
  pending,
  refresh,
  error: rolesError,
} = await platformRoles.get({
  key: "platform-roles-list",
});

watch(
  () => unref(rolesError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách vai trò!");
  },
);

const searchQuery = ref("");
const roles = computed<RoleWithSummary[]>(() => {
  const data = extractApiData(rolesRes);
  return Array.isArray(data) ? data : [];
});

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
  { title: "Vai trò", key: "name", width: 260 },
  { title: "Mô tả", dataIndex: "description", key: "description" },
  { title: "Nhân sự", key: "user_count", width: 130, align: "center" },
  { title: "Quyền hạn", key: "perm_count", width: 130, align: "center" },
  { title: "Thao tác", key: "actions", width: 140, fixed: "right" },
];

// Create role
const submitting = ref(false);
const createOpen = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = reactive<CreateRoleInput>({
  code: "",
  name: "",
  description: "",
});
const createRules: Record<string, Rule[]> = {
  code: [{ required: true, message: "Vui lòng nhập mã vai trò", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên vai trò", trigger: "blur" }],
};

const openCreateModal = () => {
  createForm.code = "";
  createForm.name = "";
  createForm.description = "";
  createOpen.value = true;
};

const submitCreate = async () => {
  try {
    await createFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const { data, error } = await platformRoles.post({
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      description: createForm.description?.trim() || undefined,
    });
    if (handleApiError(data, error, "Tạo vai trò thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Tạo vai trò thành công!");
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Role permissions drawer
const permDrawerOpen = ref(false);
const loadingPerms = ref(false);
const selectedRole = ref<RoleWithSummary | null>(null);
const allPermissions = ref<PlatformPermission[]>([]);
const checkedCodes = ref<string[]>([]);
const permSearch = ref("");

const loadPermissionsCatalog = async () => {
  if (allPermissions.value.length > 0) return;
  loadingPerms.value = true;
  try {
    const { data, error } = await platformPermissions.getClient();
    if (handleApiError(data, error, "Không thể tải danh sách quyền nền tảng!")) return;
    const list = extractApiData(data);
    allPermissions.value = Array.isArray(list) ? list : [];
  } finally {
    loadingPerms.value = false;
  }
};

const openPermDrawer = async (record: RoleWithSummary) => {
  selectedRole.value = record;
  permSearch.value = "";
  const initialCodes = record.permission_codes?.length
    ? record.permission_codes
    : (record.permissions || []).map((p) => p.code).filter(Boolean) as string[];
  checkedCodes.value = [...initialCodes];
  permDrawerOpen.value = true;
  await loadPermissionsCatalog();
};

const groupedPermissions = computed(() => {
  const q = permSearch.value.trim().toLowerCase();
  const filtered = allPermissions.value.filter(
    (p) =>
      !q ||
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.module?.toLowerCase().includes(q),
  );

  const map = new Map<string, PlatformPermission[]>();
  for (const perm of filtered) {
    const mod = perm.module || "Chung";
    if (!map.has(mod)) map.set(mod, []);
    map.get(mod)!.push(perm);
  }
  return Array.from(map.entries()).map(([module, items]) => ({ module, items }));
});

const togglePermission = (code: string, checked: boolean) => {
  if (!code) return;
  if (checked) {
    if (!checkedCodes.value.includes(code)) checkedCodes.value.push(code);
  } else {
    checkedCodes.value = checkedCodes.value.filter((c) => c !== code);
  }
};

const isGroupAllChecked = (items: PlatformPermission[]) =>
  items.length > 0 && items.every((p) => p.code && checkedCodes.value.includes(p.code));

const isGroupIndeterminate = (items: PlatformPermission[]) => {
  const count = items.filter((p) => p.code && checkedCodes.value.includes(p.code)).length;
  return count > 0 && count < items.length;
};

const toggleGroup = (items: PlatformPermission[], checked: boolean) => {
  for (const item of items) {
    if (item.code) togglePermission(item.code, checked);
  }
};

const submitPermissions = async () => {
  if (!selectedRole.value?.id) return;
  submitting.value = true;
  try {
    const selectedIds = allPermissions.value
      .filter((p) => p.code && checkedCodes.value.includes(p.code) && p.id)
      .map((p) => p.id!);

    const { data, error } = await iamApi.updateRolePermissions(selectedRole.value.id, {
      permission_codes: checkedCodes.value,
      permission_ids: selectedIds,
    });
    if (handleApiError(data, error, "Cập nhật quyền cho vai trò thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Cập nhật phân quyền thành công!");
    permDrawerOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
