<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Phiên Hỗ trợ Kỹ thuật (Four-Eyes Support Mode)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý yêu cầu truy cập vào không gian trường học theo cơ chế phê duyệt 2 người (Four-Eyes)
          </ATypographyText>
        </div>

        <ASpace wrap>
          <ASelect
            v-model:value="filters.organization_id"
            placeholder="Lọc theo Tổ chức"
            allow-clear
            show-search
            option-filter-prop="label"
            class="w-56"
            :options="orgOptions"
            @change="handleFilterChange"
          />

          <ASelect
            v-model:value="filters.status"
            placeholder="Trạng thái"
            allow-clear
            class="w-36"
            :options="statusOptions"
            @change="handleFilterChange"
          />

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateModal">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Tạo yêu cầu hỗ trợ
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="sessions"
          :loading="pending"
          :pagination="{
            current: filters.page,
            pageSize: filters.limit,
            total: total,
            showSizeChanger: true,
            showTotal: (t: number) => `Tổng ${t} phiên hỗ trợ`,
          }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1100 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'org'">
              <div class="font-medium text-slate-800">{{ resolveOrgName(record.organization_id) }}</div>
              <div class="font-mono text-[11px] text-slate-400">
                {{ record.organization_id }}
                <span v-if="record.school_id"> • School: {{ record.school_id }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'session_type'">
              <ATag :color="record.session_type === 'READ_WRITE' ? 'orange' : 'blue'">
                {{ record.session_type || "—" }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'status'">
              <ATag :color="statusColor(record.status)">{{ record.status || "—" }}</ATag>
            </template>

            <template v-else-if="column.key === 'expires_at'">
              <div class="text-xs text-slate-700">{{ formatDateTime(record.expires_at) }}</div>
              <div class="text-[11px] text-slate-400">Tạo: {{ formatDateTime(record.created_at) }}</div>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <!-- Four-Eyes: chỉ người khác mới được duyệt -->
                <APopconfirm
                  v-if="record.status === 'PENDING' && record.actor_platform_user_id !== currentUser?.id"
                  title="Phê duyệt phiên hỗ trợ này?"
                  ok-text="Phê duyệt"
                  cancel-text="Hủy"
                  @confirm="handleApprove(record)"
                >
                  <AButton size="small" type="primary">Phê duyệt</AButton>
                </APopconfirm>

                <AButton
                  v-if="record.status === 'APPROVED' || record.status === 'ACTIVE'"
                  size="small"
                  type="primary"
                  ghost
                  @click="handleExchangeToken(record)"
                >
                  Đổi Token
                </AButton>

                <AButton
                  v-if="['PENDING', 'APPROVED', 'ACTIVE'].includes(record.status || '')"
                  size="small"
                  danger
                  @click="openRevokeModal(record)"
                >
                  Thu hồi
                </AButton>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Tạo yêu cầu hỗ trợ -->
    <AModal
      v-model:open="createOpen"
      title="Tạo yêu cầu phiên hỗ trợ (Support Mode)"
      :confirm-loading="submitting"
      ok-text="Gửi yêu cầu"
      cancel-text="Hủy"
      width="620px"
      @ok="submitCreate"
    >
      <AForm ref="formRef" :model="createForm" :rules="formRules" layout="vertical" class="mt-3">
        <AFormItem label="Tổ chức cần hỗ trợ" name="organization_id">
          <ASelect
            v-model:value="createForm.organization_id"
            show-search
            option-filter-prop="label"
            placeholder="Chọn Tổ chức"
            :options="orgOptions"
          />
        </AFormItem>

        <ARow :gutter="12">
          <ACol :span="12">
            <AFormItem label="Loại phiên" name="session_type">
              <ASelect v-model:value="createForm.session_type" :options="sessionTypeOptions" />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="Thời lượng (phút)" name="duration_minutes">
              <AInputNumber v-model:value="createForm.duration_minutes" :min="5" :max="480" class="!w-full" />
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem label="School ID (tuỳ chọn)" name="school_id">
          <AInput v-model:value="createForm.school_id" placeholder="UUID trường cụ thể (nếu giới hạn)" class="font-mono" />
        </AFormItem>

        <AFormItem label="Quyền tạm cấp (Granted Permissions)" name="granted_permissions">
          <ASelect
            v-model:value="createForm.granted_permissions"
            mode="multiple"
            show-search
            option-filter-prop="label"
            placeholder="Chọn mã quyền Tenant cần thao tác"
            :options="permissionOptions"
          />
        </AFormItem>

        <AFormItem label="Lý do hỗ trợ" name="reason">
          <ATextarea v-model:value="createForm.reason" :rows="3" placeholder="Mô tả ticket / lỗi cần xử lý" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Thu hồi -->
    <AModal
      v-model:open="revokeOpen"
      title="Thu hồi phiên hỗ trợ"
      :confirm-loading="submitting"
      ok-text="Xác nhận thu hồi"
      cancel-text="Hủy"
      :ok-button-props="{ danger: true }"
      @ok="submitRevoke"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Lý do thu hồi">
          <ATextarea v-model:value="revokeReason" :rows="3" placeholder="Hoàn tất xử lý hoặc hủy yêu cầu" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Modal Hiển thị Token đã đổi -->
    <AModal v-model:open="tokenModalOpen" title="Token truy cập phiên hỗ trợ" :footer="null" width="600px">
      <AAlert
        type="warning"
        show-icon
        class="mb-4 mt-2"
        title="Token chỉ hiển thị một lần. Mọi thao tác dùng token này đều được ghi nhận trong Audit Logs."
      />
      <pre class="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-300">{{ JSON.stringify(exchangedTokenData, null, 2) }}</pre>
      <div class="mt-3 flex justify-end gap-2">
        <AButton @click="copyExchangedToken">Sao chép JSON</AButton>
        <AButton type="primary" @click="tokenModalOpen = false">Đóng</AButton>
      </div>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { useSupportApi } from "~/composables/api/useSupportApi";
import type { TenantPermission } from "~/types/api/catalog";
import type { CreateSessionInput, SupportAccessSession } from "~/types/api/support";
import type { OrganizationSummary } from "~/types/api/tenant";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Phiên hỗ trợ kỹ thuật | School ERP",
});

const { user: currentUser } = useAuth();
const { platformSupportSessions, platformOrganizations, catalogPermissions } = useApi();
const supportApi = useSupportApi();
const { extractApiData, handleApiError } = useApiError();

const filters = reactive({
  status: undefined as string | undefined,
  organization_id: undefined as string | undefined,
  page: 1,
  limit: 20,
});

const queryParams = computed(() => ({
  page: filters.page,
  limit: filters.limit,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.organization_id ? { organization_id: filters.organization_id } : {}),
}));

const {
  data: sessionsRes,
  pending,
  refresh,
  error: sessionsError,
} = await platformSupportSessions.get({
  key: "support-sessions-list",
  query: queryParams,
});

watch(
  () => unref(sessionsError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách phiên hỗ trợ!");
  },
);

const sessions = computed<SupportAccessSession[]>(() => {
  const data = extractApiData(sessionsRes);
  return Array.isArray(data) ? data : [];
});

const total = computed<number>(() => {
  const raw = unref(sessionsRes) as { meta?: { total?: number } } | null;
  return raw?.meta?.total ?? sessions.value.length;
});

// Load danh sách Tổ chức & Tenant Permissions
const { data: orgsRes } = await platformOrganizations.get({
  key: "support-orgs-options",
  query: { page: 1, limit: 100 },
});
const { data: permsRes } = await catalogPermissions.get({ key: "support-perms-options" });

const orgList = computed<OrganizationSummary[]>(() => {
  const data = extractApiData(orgsRes);
  return Array.isArray(data) ? data : [];
});

const orgOptions = computed(() =>
  orgList.value.map((o) => ({
    label: `${o.name || o.code} (${o.subdomain || o.code || ""})`,
    value: o.id || "",
  })),
);

const permissionOptions = computed(() => {
  const list = extractApiData(permsRes);
  if (!Array.isArray(list)) return [];
  return (list as TenantPermission[]).map((p) => ({
    label: `${p.name || p.code} (${p.code})`,
    value: p.code || "",
  }));
});

const resolveOrgName = (id?: string) => {
  if (!id) return "—";
  return orgList.value.find((o) => o.id === id)?.name || id;
};

const statusOptions = [
  { label: "PENDING", value: "PENDING" },
  { label: "APPROVED", value: "APPROVED" },
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "EXPIRED", value: "EXPIRED" },
  { label: "REVOKED", value: "REVOKED" },
  { label: "REJECTED", value: "REJECTED" },
];

const sessionTypeOptions = [
  { label: "READ_ONLY (Chỉ xem)", value: "READ_ONLY" },
  { label: "READ_WRITE (Xem & Sửa)", value: "READ_WRITE" },
];

const statusColor = (status?: string) => {
  if (status === "ACTIVE" || status === "APPROVED") return "success";
  if (status === "PENDING") return "processing";
  if (status === "REVOKED" || status === "REJECTED") return "error";
  return "default";
};

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};

const columns: TableProps["columns"] = [
  { title: "Tổ chức", key: "org", width: 250 },
  { title: "Loại phiên", key: "session_type", width: 130, align: "center" },
  { title: "Lý do", dataIndex: "reason", key: "reason" },
  { title: "Trạng thái", key: "status", width: 120, align: "center" },
  { title: "Hết hạn", key: "expires_at", width: 170 },
  { title: "Thao tác", key: "actions", width: 220, fixed: "right" },
];

const handleFilterChange = () => {
  filters.page = 1;
};

const handleTableChange: TableProps["onChange"] = (pagination) => {
  filters.page = pagination.current || 1;
  filters.limit = pagination.pageSize || 20;
};

// Create request
const createOpen = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const createForm = reactive<CreateSessionInput>({
  organization_id: undefined,
  school_id: "",
  session_type: "READ_ONLY",
  duration_minutes: 60,
  granted_permissions: [],
  reason: "",
});

const formRules: Record<string, Rule[]> = {
  organization_id: [{ required: true, message: "Vui lòng chọn Tổ chức", trigger: "change" }],
  reason: [{ required: true, message: "Vui lòng nhập lý do hỗ trợ", trigger: "blur" }],
};

const openCreateModal = () => {
  createForm.organization_id = undefined;
  createForm.school_id = "";
  createForm.session_type = "READ_ONLY";
  createForm.duration_minutes = 60;
  createForm.granted_permissions = [];
  createForm.reason = "";
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
    const { data, error } = await platformSupportSessions.post({
      organization_id: createForm.organization_id,
      school_id: createForm.school_id?.trim() || undefined,
      session_type: createForm.session_type,
      duration_minutes: createForm.duration_minutes,
      granted_permissions: createForm.granted_permissions,
      reason: createForm.reason?.trim(),
    });
    if (handleApiError(data, error, "Tạo yêu cầu hỗ trợ thất bại!")) return;

    message.success("Đã gửi yêu cầu phiên hỗ trợ!");
    createOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Approve
const handleApprove = async (record: SupportAccessSession) => {
  if (!record.id) return;
  const { data, error } = await supportApi.approveSession(record.id);
  if (handleApiError(data, error, "Phê duyệt phiên hỗ trợ thất bại!")) return;
  message.success("Đã phê duyệt phiên hỗ trợ!");
  await refresh();
};

// Exchange token
const tokenModalOpen = ref(false);
const exchangedTokenData = ref<unknown>(null);

const handleExchangeToken = async (record: SupportAccessSession) => {
  if (!record.id) return;
  const { data, error } = await supportApi.exchangeSessionToken(record.id);
  if (handleApiError(data, error, "Đổi token truy cập thất bại!")) return;
  exchangedTokenData.value = extractApiData(data);
  tokenModalOpen.value = true;
  await refresh();
};

const copyExchangedToken = async () => {
  if (!import.meta.client) return;
  await navigator.clipboard.writeText(JSON.stringify(exchangedTokenData.value, null, 2));
  message.success("Đã sao chép dữ liệu token!");
};

// Revoke
const revokeOpen = ref(false);
const revokeReason = ref("");
const revokingId = ref<string | null>(null);

const openRevokeModal = (record: SupportAccessSession) => {
  revokingId.value = record.id || null;
  revokeReason.value = "";
  revokeOpen.value = true;
};

const submitRevoke = async () => {
  if (!revokingId.value) return;
  submitting.value = true;
  try {
    const body = revokeReason.value.trim() ? { reason: revokeReason.value.trim() } : {};
    const { data, error } = await supportApi.revokeSession(revokingId.value, body);
    if (handleApiError(data, error, "Thu hồi phiên hỗ trợ thất bại!")) return;
    message.success("Đã thu hồi phiên hỗ trợ!");
    revokeOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};
</script>
