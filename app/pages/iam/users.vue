<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="shadow-xs !rounded-xl !border-slate-200/80">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">Quản lý Nhân sự Nền tảng (IAM)</ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">Quản lý tài khoản nhân sự nền tảng, xem chi tiết, cập nhật thông tin/trạng thái, gán vai trò và đặt lại mật khẩu</ATypographyText>
        </div>

        <ASpace wrap>
          <AInput v-model:value="searchInput" placeholder="Tìm theo tên, email..." allow-clear class="w-56" @press-enter="handleSearch" @change="handleSearchInputChange">
            <template #prefix>
              <Icon name="ant-design:search-outlined" class="text-slate-400" />
            </template>
          </AInput>

          <ASelect v-model:value="filters.status" placeholder="Trạng thái" allow-clear class="w-36" :options="statusOptions" @change="handleFilterChange" />

          <ASelect v-model:value="filters.role_id" placeholder="Vai trò" allow-clear show-search option-filter-prop="label" class="w-44" :options="roleOptions" @change="handleFilterChange" />

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
    <ACard class="shadow-xs !rounded-xl !border-slate-200/80">
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
          :scroll="{ x: 1050 }"
          @change="handleTableChange">
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
                <ATooltip title="Xem chi tiết">
                  <AButton size="small" @click="openDetailDrawer(record)">
                    <template #icon><Icon name="ant-design:eye-outlined" /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Cập nhật thông tin & trạng thái">
                  <AButton size="small" @click="openEditModal(record)">
                    <template #icon><Icon name="ant-design:edit-outlined" /></template>
                  </AButton>
                </ATooltip>

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

    <!-- Drawer Chi tiết Nhân sự -->
    <ADrawer v-model:open="detailOpen" :title="`Chi tiết nhân sự — ${userDetail?.full_name || userDetail?.email || ''}`" :size="560">
      <ASpin :spinning="loadingDetail">
        <div v-if="userDetail" class="space-y-5">
          <div class="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <AAvatar :size="48" :src="userDetail.avatar_url || undefined" class="bg-blue-600 text-white">
              <template #icon><Icon name="ant-design:user-outlined" /></template>
            </AAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-slate-800">{{ userDetail.full_name || "—" }}</div>
              <div class="truncate text-xs text-slate-500">{{ userDetail.email }}</div>
            </div>
            <ATag :color="statusColor(userDetail.status)">{{ userDetail.status || "—" }}</ATag>
          </div>

          <ADescriptions :column="1" bordered size="small" :items="detailDescriptionItems" />

          <div>
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vai trò được gán ({{ userDetail.roles?.length ?? 0 }})</div>
            <div v-if="userDetail.roles?.length" class="space-y-2">
              <div v-for="r in userDetail.roles" :key="r.id || r.code" class="rounded-lg border border-slate-200/80 p-2.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-slate-800">{{ r.name || r.code }}</span>
                  <span class="font-mono text-xs text-slate-500">{{ r.code }}</span>
                </div>
                <div v-if="r.description" class="mt-1 text-xs text-slate-500">{{ r.description }}</div>
              </div>
            </div>
            <AEmpty v-else description="Chưa gán vai trò nào" />
          </div>
        </div>
      </ASpin>
    </ADrawer>

    <!-- Modal Tạo mới Nhân sự -->
    <AModal v-model:open="createOpen" title="Thêm nhân sự nền tảng" :confirm-loading="submitting" ok-text="Tạo nhân sự" cancel-text="Hủy" @ok="submitCreate">
      <AForm ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical" class="mt-3">
        <AFormItem label="Họ và tên" name="full_name">
          <AInput v-model:value="createForm.full_name" placeholder="Trần Minh Anh" />
        </AFormItem>
        <AFormItem label="Email" name="email">
          <AInput v-model:value="createForm.email" placeholder="cskh.hanoi@school-erp.vn" />
        </AFormItem>
        <AFormItem label="Số điện thoại" name="phone">
          <AInput v-model:value="createForm.phone" placeholder="0912345678" />
        </AFormItem>
        <AFormItem label="Mật khẩu khởi tạo" name="password">
          <AInputPassword v-model:value="createForm.password" placeholder="Tối thiểu 8 ký tự" />
        </AFormItem>
        <AFormItem label="Vai trò" name="role_ids">
          <ASelect v-model:value="createForm.role_ids" mode="multiple" placeholder="Chọn một hoặc nhiều vai trò" option-filter-prop="label" :options="roleOptions" />
        </AFormItem>
        <AFormItem name="must_change_password" class="!mb-0">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Bắt buộc đổi mật khẩu ở lần đăng nhập đầu</span>
            <ASwitch v-model:checked="createForm.must_change_password" />
          </div>
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Cập nhật thông tin & trạng thái -->
    <AModal v-model:open="editOpen" :title="`Cập nhật nhân sự — ${selectedUser?.full_name || selectedUser?.email || ''}`" :confirm-loading="submitting" ok-text="Lưu thay đổi" cancel-text="Hủy" @ok="submitEdit">
      <AForm ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical" class="mt-3">
        <AFormItem label="Họ và tên" name="full_name">
          <AInput v-model:value="editForm.full_name" placeholder="Trần Minh Anh" />
        </AFormItem>
        <AFormItem label="Số điện thoại" name="phone">
          <AInput v-model:value="editForm.phone" placeholder="0912345678" />
        </AFormItem>
        <AFormItem label="Trạng thái" name="status">
          <ASelect v-model:value="editForm.status" :options="statusOptions" />
        </AFormItem>
        <AFormItem label="Lý do cập nhật" name="reason">
          <ATextarea v-model:value="editForm.reason" :rows="2" placeholder="Cập nhật thông tin nhân sự" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Cập nhật Vai trò -->
    <AModal v-model:open="rolesOpen" :title="`Cập nhật vai trò — ${selectedUser?.full_name || selectedUser?.email || ''}`" :confirm-loading="submitting" ok-text="Lưu vai trò" cancel-text="Hủy" @ok="submitRoles">
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Danh sách vai trò">
          <ASelect v-model:value="selectedRoleIds" mode="multiple" placeholder="Chọn vai trò" option-filter-prop="label" :options="roleOptions" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Đặt lại mật khẩu -->
    <AModal v-model:open="passwordOpen" :title="`Đặt lại mật khẩu — ${selectedUser?.full_name || selectedUser?.email || ''}`" :confirm-loading="submitting" ok-text="Đặt lại mật khẩu" cancel-text="Hủy" @ok="submitResetPassword">
      <AForm ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" layout="vertical" class="mt-3">
        <AFormItem label="Mật khẩu mới" name="new_password">
          <AInputPassword v-model:value="passwordForm.new_password" placeholder="Nhập mật khẩu tạm thời (tối thiểu 8 ký tự)" />
        </AFormItem>
        <AFormItem label="Lý do đặt lại" name="reason">
          <ATextarea v-model:value="passwordForm.reason" :rows="2" placeholder="Quên mật khẩu" />
        </AFormItem>
        <AFormItem name="must_change_password" class="!mb-0">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Bắt buộc đổi mật khẩu ở lần đăng nhập kế tiếp</span>
            <ASwitch v-model:checked="passwordForm.must_change_password" />
          </div>
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Tắt MFA bắt buộc -->
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
        <AFormItem label="Lý do (tùy chọn)">
          <ATextarea v-model:value="mfaReason" :rows="3" placeholder="Ví dụ: Nhân sự bị mất thiết bị Authenticator" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableEmits } from "antdv-next";
import { usePlatformIamApi } from "~/composables/api/usePlatformIamApi";
import type { CreateUserInput, PlatformRole, PlatformUser, UpdateUserInput } from "~/types/api/iam";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Nhân sự Nền tảng (IAM) | School ERP",
});

const { platformIamUsers, platformIamRoles } = useApi();
const iamApi = usePlatformIamApi();
const { extractApiData, handleApiError } = useApiError();

const searchInput = ref("");
const filters = reactive({
  search: "",
  status: undefined as string | undefined,
  role_id: undefined as string | undefined,
  page: 1,
  limit: 20,
});

const statusOptions = [
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "INACTIVE", value: "INACTIVE" },
  { label: "LOCKED", value: "LOCKED" },
  { label: "SUSPENDED", value: "SUSPENDED" },
];

const {
  data: usersRes,
  pending,
  refresh,
  error: usersError,
} = await platformIamUsers.get({
  key: "iam-users-list",
  query: filters,
});

const { data: rolesRes } = await platformIamRoles.get({
  key: "iam-users-roles-options",
});

watch(
  () => unref(usersError),
  err => err && handleApiError(null, err, "Không thể tải danh sách nhân sự!"),
);

const users = computed<PlatformUser[]>(() => (extractApiData(usersRes) as PlatformUser[]) ?? []);
const total = computed(() => (unref(usersRes) as { meta?: { total?: number } } | null)?.meta?.total ?? users.value.length);

const rolesList = computed<PlatformRole[]>(() => (extractApiData(rolesRes) as PlatformRole[]) ?? []);
const roleOptions = computed(() =>
  rolesList.value
    .filter(r => Boolean(r.id))
    .map(r => ({
      label: r.name ? `${r.name} (${r.code})` : r.code || "",
      value: r.id!,
    })),
);

const columns = [
  { title: "Nhân sự", key: "user", width: 280 },
  { title: "Vai trò", key: "roles", width: 220 },
  { title: "MFA", key: "mfa", width: 100 },
  { title: "Trạng thái", key: "status", width: 120 },
  { title: "Đăng nhập gần nhất", key: "last_login_at", width: 170 },
  { title: "Thao tác", key: "actions", width: 195, fixed: "right" as const },
];

const statusColor = (status?: string) => {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "LOCKED":
    case "SUSPENDED":
      return "error";
    case "INACTIVE":
      return "default";
    default:
      return "processing";
  }
};

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString("vi-VN");
};

const handleSearch = () => {
  filters.search = searchInput.value.trim();
  filters.page = 1;
};

const handleSearchInputChange = () => {
  if (!searchInput.value && filters.search) {
    filters.search = "";
    filters.page = 1;
  }
};

const handleFilterChange = () => {
  filters.page = 1;
};

const handleTableChange: TableEmits["change"] = (pagination) => {
  filters.page = pagination.current || 1;
  filters.limit = pagination.pageSize || 20;
};

const submitting = ref(false);
const selectedUser = ref<PlatformUser | null>(null);

// --- Chi tiết nhân sự (GET /v1/platform/iam/users/{id}) ---
const detailOpen = ref(false);
const loadingDetail = ref(false);
const userDetail = ref<PlatformUser | null>(null);

const detailDescriptionItems = computed(() => {
  const u = userDetail.value;
  if (!u) return [];
  return [
    { key: "id", label: "ID", content: u.id || "—" },
    { key: "phone", label: "Số điện thoại", content: u.phone || "—" },
    { key: "mfa", label: "MFA (TOTP)", content: u.mfa_enabled ? "Đã bật" : "Chưa bật" },
    { key: "must_change_pw", label: "Bắt buộc đổi mật khẩu", content: u.must_change_password ? "Có" : "Không" },
    { key: "last_login", label: "Đăng nhập gần nhất", content: formatDateTime(u.last_login_at) },
    { key: "created_at", label: "Ngày tạo", content: formatDateTime(u.created_at) },
    { key: "updated_at", label: "Cập nhật gần nhất", content: formatDateTime(u.updated_at) },
  ];
});

const openDetailDrawer = async (record: PlatformUser) => {
  userDetail.value = record;
  detailOpen.value = true;
  if (!record.id) return;

  loadingDetail.value = true;
  try {
    const { data, error } = await iamApi.getIamUser(record.id);
    if (handleApiError(data, error, "Không thể tải chi tiết nhân sự!")) return;
    const detail = extractApiData(data) as PlatformUser | null;
    if (detail) userDetail.value = detail;
  } finally {
    loadingDetail.value = false;
  }
};

// --- Tạo mới nhân sự (POST /v1/platform/iam/users) ---
const createOpen = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = reactive<CreateUserInput>({
  email: "",
  full_name: "",
  password: "",
  phone: "",
  role_ids: [],
  must_change_password: true,
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
  createForm.email = "";
  createForm.full_name = "";
  createForm.password = "";
  createForm.phone = "";
  createForm.role_ids = [];
  createForm.must_change_password = true;
  createOpen.value = true;
};

const submitCreate = async () => {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    const payload: CreateUserInput = {
      email: createForm.email.trim(),
      full_name: createForm.full_name.trim(),
      password: createForm.password,
      must_change_password: createForm.must_change_password,
      ...(createForm.phone?.trim() ? { phone: createForm.phone.trim() } : {}),
      ...(createForm.role_ids?.length ? { role_ids: createForm.role_ids } : {}),
    };
    const { data, error } = await platformIamUsers.post(payload);
    if (handleApiError(data, error, "Tạo nhân sự thất bại!")) return;
    message.success(unref(data)?.message || "Tạo nhân sự thành công!");
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// --- Cập nhật thông tin & trạng thái (PATCH /v1/platform/iam/users/{id}) ---
const editOpen = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = reactive<UpdateUserInput>({
  full_name: "",
  phone: "",
  status: "ACTIVE",
  reason: "",
});

const editRules: Record<string, Rule[]> = {
  full_name: [{ required: true, message: "Vui lòng nhập họ và tên", trigger: "blur" }],
  status: [{ required: true, message: "Vui lòng chọn trạng thái", trigger: "change" }],
};

const openEditModal = (record: PlatformUser) => {
  selectedUser.value = record;
  editForm.full_name = record.full_name || "";
  editForm.phone = record.phone || "";
  editForm.status = record.status || "ACTIVE";
  editForm.reason = "";
  editOpen.value = true;
};

const submitEdit = async () => {
  if (!selectedUser.value?.id) return;
  await editFormRef.value?.validate();
  submitting.value = true;
  try {
    const payload: UpdateUserInput = {
      full_name: editForm.full_name?.trim(),
      phone: editForm.phone?.trim() || undefined,
      status: editForm.status,
      ...(editForm.reason?.trim() ? { reason: editForm.reason.trim() } : {}),
    };
    const { data, error } = await iamApi.updateIamUser(selectedUser.value.id, payload);
    if (handleApiError(data, error, "Cập nhật nhân sự thất bại!")) return;
    message.success(unref(data)?.message || "Cập nhật nhân sự thành công!");
    editOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// --- Cập nhật vai trò (PUT /v1/platform/iam/users/{id}/roles) ---
const rolesOpen = ref(false);
const selectedRoleIds = ref<string[]>([]);

const openRolesModal = (record: PlatformUser) => {
  selectedUser.value = record;
  selectedRoleIds.value = (record.roles || []).map(r => r.id).filter(Boolean) as string[];
  rolesOpen.value = true;
};

const submitRoles = async () => {
  if (!selectedUser.value?.id) return;
  submitting.value = true;
  try {
    const { data, error } = await iamApi.updateIamUserRoles(selectedUser.value.id, {
      role_ids: selectedRoleIds.value,
    });
    if (handleApiError(data, error, "Cập nhật vai trò thất bại!")) return;
    message.success(unref(data)?.message || "Đã cập nhật vai trò nhân sự!");
    rolesOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// --- Đặt lại mật khẩu (POST /v1/platform/iam/users/{id}/reset-password) ---
const passwordOpen = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  new_password: "",
  must_change_password: true,
  reason: "",
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
  passwordForm.reason = "";
  passwordOpen.value = true;
};

const submitResetPassword = async () => {
  if (!selectedUser.value?.id) return;
  await passwordFormRef.value?.validate();
  submitting.value = true;
  try {
    const { data, error } = await iamApi.resetIamUserPassword(selectedUser.value.id, {
      new_password: passwordForm.new_password,
      must_change_password: passwordForm.must_change_password,
      ...(passwordForm.reason.trim() ? { reason: passwordForm.reason.trim() } : {}),
    });
    if (handleApiError(data, error, "Đặt lại mật khẩu thất bại!")) return;
    message.success(unref(data)?.message || "Đã đặt lại mật khẩu cho nhân sự!");
    passwordOpen.value = false;
  } finally {
    submitting.value = false;
  }
};

// --- Tắt MFA bắt buộc (PATCH /v1/platform/users/{id}/mfa/disable) ---
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
    message.success(unref(data)?.message || "Đã tắt MFA cho nhân sự!");
    mfaOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
