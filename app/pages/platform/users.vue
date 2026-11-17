<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Quản lý Nhân sự Nền tảng
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý tài khoản vận hành Platform, gán vai trò, khóa tài khoản, đặt lại mật khẩu và tắt MFA
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchInput"
            placeholder="Tìm theo tên, email..."
            allow-clear
            class="w-56"
            @press-enter="handleSearch"
            @change="handleSearchInputChange"
          >
            <template #prefix>
              <Icon name="ant-design:search-outlined" class="text-slate-400" />
            </template>
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
            v-model:value="filters.role_id"
            placeholder="Vai trò"
            allow-clear
            show-search
            option-filter-prop="label"
            class="w-44"
            :options="roleOptions"
            @change="handleFilterChange"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateModal">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Thêm nhân sự
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Users Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="users"
          :loading="pending"
          :pagination="{
            current: filters.page,
            pageSize: filters.limit,
            total: total,
            showSizeChanger: true,
            showTotal: (t: number) => `Tổng ${t} nhân sự`,
          }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1000 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'user'">
              <div class="flex items-center gap-3">
                <AAvatar :src="record.avatar_url || undefined" class="bg-blue-600 text-white">
                  <template #icon><Icon name="ant-design:user-outlined" /></template>
                </AAvatar>
                <div>
                  <div class="font-medium text-slate-800">{{ record.full_name || "—" }}</div>
                  <div class="text-xs text-slate-500">{{ record.email }}</div>
                  <div v-if="record.phone" class="text-[11px] text-slate-400">{{ record.phone }}</div>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'roles'">
              <div v-if="record.roles?.length" class="flex flex-wrap gap-1">
                <ATag v-for="r in record.roles" :key="r.id || r.code" color="blue">
                  {{ r.name || r.code }}
                </ATag>
              </div>
              <span v-else class="text-xs text-slate-400">Chưa gán</span>
            </template>

            <template v-else-if="column.key === 'mfa'">
              <ATag :color="record.mfa_enabled ? 'green' : 'default'">
                {{ record.mfa_enabled ? "Đã bật" : "Chưa bật" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'status'">
              <ATag :color="statusColor(record.status)">
                {{ record.status || "—" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'last_login_at'">
              <span class="text-xs text-slate-600">{{ formatDateTime(record.last_login_at) }}</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <ATooltip title="Cập nhật vai trò">
                  <AButton size="small" @click="openRolesModal(record)">
                    <template #icon><Icon name="ant-design:team-outlined" /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Đặt lại mật khẩu">
                  <AButton size="small" @click="openPasswordModal(record)">
                    <template #icon><Icon name="ant-design:key-outlined" /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Cập nhật trạng thái">
                  <AButton size="small" @click="openStatusModal(record)">
                    <template #icon><Icon name="ant-design:swap-outlined" /></template>
                  </AButton>
                </ATooltip>

                <ATooltip v-if="record.mfa_enabled" title="Tắt MFA bắt buộc">
                  <AButton size="small" danger @click="openDisableMfaModal(record)">
                    <template #icon><Icon name="ant-design:safety-certificate-outlined" /></template>
                  </AButton>
                </ATooltip>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Tạo mới Nhân sự -->
    <AModal
      v-model:open="createOpen"
      title="Thêm nhân sự nền tảng"
      :confirm-loading="submitting"
      ok-text="Tạo nhân sự"
      cancel-text="Hủy"
      @ok="submitCreate"
    >
      <AForm ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical" class="mt-3">
        <AFormItem label="Họ và tên" name="full_name">
          <AInput v-model:value="createForm.full_name" placeholder="Nguyễn Văn A" />
        </AFormItem>
        <AFormItem label="Email" name="email">
          <AInput v-model:value="createForm.email" placeholder="staff@school-erp.vn" />
        </AFormItem>
        <AFormItem label="Số điện thoại" name="phone">
          <AInput v-model:value="createForm.phone" placeholder="0901234567" />
        </AFormItem>
        <AFormItem label="Mật khẩu khởi tạo" name="password">
          <AInputPassword v-model:value="createForm.password" placeholder="Tối thiểu 8 ký tự" />
        </AFormItem>
        <AFormItem label="Vai trò" name="role_ids">
          <ASelect
            v-model:value="createForm.role_ids"
            mode="multiple"
            placeholder="Chọn một hoặc nhiều vai trò"
            option-filter-prop="label"
            :options="roleOptions"
          />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Cập nhật Vai trò -->
    <AModal
      v-model:open="rolesOpen"
      :title="`Cập nhật vai trò — ${selectedUser?.full_name || selectedUser?.email || ''}`"
      :confirm-loading="submitting"
      ok-text="Lưu vai trò"
      cancel-text="Hủy"
      @ok="submitRoles"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Danh sách vai trò">
          <ASelect
            v-model:value="selectedRoleIds"
            mode="multiple"
            placeholder="Chọn vai trò"
            option-filter-prop="label"
            :options="roleOptions"
          />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Đặt lại mật khẩu -->
    <AModal
      v-model:open="passwordOpen"
      :title="`Đặt lại mật khẩu — ${selectedUser?.full_name || selectedUser?.email || ''}`"
      :confirm-loading="submitting"
      ok-text="Cập nhật"
      cancel-text="Hủy"
      @ok="submitPassword"
    >
      <AForm ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" layout="vertical" class="mt-3">
        <AFormItem label="Mật khẩu mới" name="new_password">
          <AInputPassword v-model:value="passwordForm.new_password" placeholder="Tối thiểu 8 ký tự" />
        </AFormItem>
        <ACheckbox v-model:checked="passwordForm.must_change_password">
          Bắt buộc người dùng đổi mật khẩu ở lần đăng nhập kế tiếp
        </ACheckbox>
      </AForm>
    </AModal>

    <!-- Modal Đổi trạng thái -->
    <AModal
      v-model:open="statusOpen"
      :title="`Cập nhật trạng thái — ${selectedUser?.full_name || selectedUser?.email || ''}`"
      :confirm-loading="submitting"
      ok-text="Cập nhật"
      cancel-text="Hủy"
      @ok="submitStatus"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Trạng thái tài khoản">
          <ASelect v-model:value="selectedStatus" :options="statusOptions" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Tắt MFA -->
    <AModal
      v-model:open="mfaOpen"
      :title="`Tắt MFA — ${selectedUser?.full_name || selectedUser?.email || ''}`"
      :confirm-loading="submitting"
      ok-text="Xác nhận tắt MFA"
      cancel-text="Hủy"
      :ok-button-props="{ danger: true }"
      @ok="submitDisableMfa"
    >
      <AAlert
        type="warning"
        show-icon
        class="mb-4 mt-2"
        title="Thao tác này sẽ gỡ bỏ yêu cầu xác thực 2 lớp (TOTP) của nhân sự."
      />
      <AForm layout="vertical">
        <AFormItem label="Lý do (tuỳ chọn)">
          <ATextarea v-model:value="mfaReason" :rows="3" placeholder="Ví dụ: Nhân sự bị mất thiết bị Authenticator" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { usePlatformIamApi } from "~/composables/api/usePlatformIamApi";
import type { CreateUserInput, PlatformUser, RoleWithSummary } from "~/types/api/iam";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Nhân sự Nền tảng | School ERP",
});

const { platformUsers, platformRoles } = useApi();
const iamApi = usePlatformIamApi();
const { extractApiData, handleApiError } = useApiError();

const filters = reactive({
  search: "",
  status: undefined as string | undefined,
  role_id: undefined as string | undefined,
  page: 1,
  limit: 20,
});
const searchInput = ref("");

const queryParams = computed(() => ({
  page: filters.page,
  limit: filters.limit,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.role_id ? { role_id: filters.role_id } : {}),
}));

const {
  data: usersRes,
  pending,
  refresh,
  error: usersError,
} = await platformUsers.get({
  key: "platform-users-list",
  query: queryParams,
});

watch(
  () => unref(usersError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách nhân sự!");
  },
);

const users = computed<PlatformUser[]>(() => {
  const data = extractApiData(usersRes);
  return Array.isArray(data) ? data : [];
});

const total = computed<number>(() => {
  const raw = unref(usersRes) as { meta?: { total?: number } } | null;
  return raw?.meta?.total ?? users.value.length;
});

// Tải danh sách roles để lọc & gán
const { data: rolesRes } = await platformRoles.get({
  key: "platform-roles-options",
});

const roleOptions = computed(() => {
  const list = extractApiData(rolesRes);
  if (!Array.isArray(list)) return [];
  return (list as RoleWithSummary[]).map((r) => ({
    label: `${r.name || r.code} (${r.code || ""})`,
    value: r.id || "",
  }));
});

const statusOptions = [
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "LOCKED", value: "LOCKED" },
  { label: "INACTIVE", value: "INACTIVE" },
];

const statusColor = (status?: string) => {
  if (status === "ACTIVE") return "success";
  if (status === "LOCKED") return "error";
  return "default";
};

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};

const columns: TableProps["columns"] = [
  { title: "Nhân sự", key: "user", width: 280 },
  { title: "Vai trò", key: "roles", width: 220 },
  { title: "MFA", key: "mfa", width: 110, align: "center" },
  { title: "Trạng thái", key: "status", width: 120, align: "center" },
  { title: "Đăng nhập gần nhất", key: "last_login_at", width: 170 },
  { title: "Thao tác", key: "actions", width: 170, fixed: "right" },
];

const handleSearch = () => {
  filters.search = searchInput.value.trim();
  filters.page = 1;
};

const handleSearchInputChange = () => {
  if (!searchInput.value) {
    handleSearch();
  }
};

const handleFilterChange = () => {
  filters.page = 1;
};

const handleTableChange: TableProps["onChange"] = (pagination) => {
  filters.page = pagination.current || 1;
  filters.limit = pagination.pageSize || 20;
};

// Modals state
const submitting = ref(false);
const selectedUser = ref<PlatformUser | null>(null);

// Create user
const createOpen = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = reactive<CreateUserInput>({
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_ids: [],
});

const createRules: Record<string, Rule[]> = {
  full_name: [{ required: true, message: "Vui lòng nhập họ và tên", trigger: "blur" }],
  email: [
    { required: true, message: "Vui lòng nhập email", trigger: "blur" },
    { type: "email", message: "Email không hợp lệ", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Vui lòng nhập mật khẩu", trigger: "blur" },
    { min: 8, message: "Mật khẩu tối thiểu 8 ký tự", trigger: "blur" },
  ],
};

const openCreateModal = () => {
  createForm.full_name = "";
  createForm.email = "";
  createForm.phone = "";
  createForm.password = "";
  createForm.role_ids = [];
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
    const { data, error } = await platformUsers.post({
      full_name: createForm.full_name.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone?.trim() || undefined,
      password: createForm.password,
      role_ids: createForm.role_ids,
    });
    if (handleApiError(data, error, "Tạo nhân sự thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Tạo nhân sự thành công!");
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Update roles
const rolesOpen = ref(false);
const selectedRoleIds = ref<string[]>([]);

const openRolesModal = (record: PlatformUser) => {
  selectedUser.value = record;
  selectedRoleIds.value = (record.roles || []).map((r) => r.id).filter(Boolean) as string[];
  rolesOpen.value = true;
};

const submitRoles = async () => {
  if (!selectedUser.value?.id) return;
  submitting.value = true;
  try {
    const { data, error } = await iamApi.updateUserRoles(selectedUser.value.id, {
      role_ids: selectedRoleIds.value,
    });
    if (handleApiError(data, error, "Cập nhật vai trò thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Cập nhật vai trò thành công!");
    rolesOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Reset password
const passwordOpen = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  new_password: "",
  must_change_password: true,
});
const passwordRules: Record<string, Rule[]> = {
  new_password: [
    { required: true, message: "Vui lòng nhập mật khẩu mới", trigger: "blur" },
    { min: 8, message: "Mật khẩu tối thiểu 8 ký tự", trigger: "blur" },
  ],
};

const openPasswordModal = (record: PlatformUser) => {
  selectedUser.value = record;
  passwordForm.new_password = "";
  passwordForm.must_change_password = true;
  passwordOpen.value = true;
};

const submitPassword = async () => {
  if (!selectedUser.value?.id) return;
  try {
    await passwordFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const { data, error } = await iamApi.resetUserPassword(selectedUser.value.id, {
      password: passwordForm.new_password,
      new_password: passwordForm.new_password,
      must_change_password: passwordForm.must_change_password,
    });
    if (handleApiError(data, error, "Đặt lại mật khẩu thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Đặt lại mật khẩu thành công!");
    passwordOpen.value = false;
  } finally {
    submitting.value = false;
  }
};

// Update status
const statusOpen = ref(false);
const selectedStatus = ref("ACTIVE");

const openStatusModal = (record: PlatformUser) => {
  selectedUser.value = record;
  selectedStatus.value = record.status || "ACTIVE";
  statusOpen.value = true;
};

const submitStatus = async () => {
  if (!selectedUser.value?.id) return;
  submitting.value = true;
  try {
    const { data, error } = await iamApi.updateUserStatus(selectedUser.value.id, {
      status: selectedStatus.value,
    });
    if (handleApiError(data, error, "Cập nhật trạng thái thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Cập nhật trạng thái thành công!");
    statusOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Disable MFA
const mfaOpen = ref(false);
const mfaReason = ref("");

const openDisableMfaModal = (record: PlatformUser) => {
  selectedUser.value = record;
  mfaReason.value = "";
  mfaOpen.value = true;
};

const submitDisableMfa = async () => {
  if (!selectedUser.value?.id) return;
  submitting.value = true;
  try {
    const body: Record<string, string> = mfaReason.value.trim()
      ? { reason: mfaReason.value.trim() }
      : {};
    const { data, error } = await iamApi.disableUserMfa(selectedUser.value.id, body);
    if (handleApiError(data, error, "Tắt MFA cho nhân sự thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Đã tắt MFA cho nhân sự!");
    mfaOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
