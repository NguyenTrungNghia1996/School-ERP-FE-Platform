<template>
  <div class="space-y-4">
    <!-- Header Card -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <AAvatar :size="64" :src="user?.avatar_url || undefined" class="bg-blue-600 text-white">
            <template #icon>
              <Icon name="ant-design:user-outlined" class="text-2xl" />
            </template>
          </AAvatar>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <ATypographyTitle :level="4" style="margin: 0">
                {{ user?.full_name || user?.email || "Tài khoản quản trị" }}
              </ATypographyTitle>
              <ATag v-if="user?.status" :color="user.status === 'ACTIVE' ? 'success' : 'default'">
                {{ user.status }}
              </ATag>
              <ATag :color="user?.mfa_enabled ? 'green' : 'default'">
                {{ user?.mfa_enabled ? "MFA: Đã bật" : "MFA: Chưa bật" }}
              </ATag>
            </div>
            <div class="mt-1 text-sm text-slate-500">{{ user?.email || "—" }}</div>
            <div v-if="roles.length" class="mt-2 flex flex-wrap gap-1.5">
              <ATag v-for="role in roles" :key="role" color="blue">{{ role }}</ATag>
            </div>
          </div>
        </div>

        <AButton :loading="refreshingMe" @click="handleRefreshProfile">
          <template #icon>
            <Icon name="ant-design:reload-outlined" />
          </template>
          Đồng bộ thông tin
        </AButton>
      </div>
    </ACard>

    <!-- Main Content Tabs -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ATabs v-model:activeKey="activeTab" :items="tabItems" @change="handleTabChange" />

      <!-- Tab 1: Thông tin tài khoản -->
      <div v-if="activeTab === 'info'" class="mt-2 space-y-5">
        <ADescriptions bordered :column="{ xs: 1, sm: 2 }" :items="profileItems" />

        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-700">
              Danh sách quyền hiệu lực ({{ permissions.length }})
            </span>
          </div>
          <div v-if="permissions.length" class="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <ATag v-for="perm in permissions" :key="perm" class="font-mono text-xs">
              {{ perm }}
            </ATag>
          </div>
          <AEmpty v-else description="Tài khoản chưa được gán mã quyền nào" />
        </div>
      </div>

      <!-- Tab 2: Đổi mật khẩu -->
      <div v-else-if="activeTab === 'password'" class="mt-2 max-w-lg">
        <AAlert
          type="info"
          show-icon
          class="mb-5"
          title="Mật khẩu mới nên có ít nhất 8 ký tự, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt."
        />
        <ProfileChangePasswordForm @success="handleRefreshProfile" />
      </div>

      <!-- Tab 3: Bảo mật 2 lớp MFA (TOTP) -->
      <div v-else-if="activeTab === 'mfa'" class="mt-2 max-w-xl space-y-5">
        <!-- MFA đang tắt -> Thiết lập & Kích hoạt -->
        <template v-if="!user?.mfa_enabled">
          <AAlert
            type="warning"
            show-icon
            title="Tài khoản hiện chưa bật xác thực 2 lớp (MFA / TOTP). Hãy kích hoạt để tăng cường bảo mật."
          />

          <div v-if="!mfaSetup">
            <AButton type="primary" :loading="mfaLoading" @click="handleSetupMfa">
              <template #icon>
                <Icon name="ant-design:qrcode-outlined" />
              </template>
              Khởi tạo khóa MFA (TOTP)
            </AButton>
          </div>

          <div v-else class="space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div class="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3">
                <ClientOnly>
                  <AQrcode
                    v-if="mfaSetup.otpauth_url"
                    :value="mfaSetup.otpauth_url"
                    :size="176"
                    :bordered="false"
                  />
                </ClientOnly>
                <span class="mt-2 text-[11px] text-slate-400">Quét bằng Google Authenticator</span>
              </div>

              <div class="flex-1 space-y-3 text-sm">
                <div>
                  <div class="text-xs font-medium text-slate-500">Nhà cung cấp (Issuer)</div>
                  <div class="font-semibold text-slate-800">{{ mfaSetup.issuer || "School ERP" }}</div>
                </div>
                <div>
                  <div class="text-xs font-medium text-slate-500">Tài khoản</div>
                  <div class="font-medium text-slate-800">{{ mfaSetup.account || user?.email }}</div>
                </div>
                <div>
                  <div class="mb-1 text-xs font-medium text-slate-500">Khóa bí mật (Secret Key)</div>
                  <div class="flex items-center gap-2">
                    <code class="rounded border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-blue-700">
                      {{ mfaSetup.secret }}
                    </code>
                    <AButton size="small" @click="copySecret(mfaSetup.secret)">
                      <template #icon>
                        <Icon name="ant-design:copy-outlined" />
                      </template>
                      Sao chép
                    </AButton>
                  </div>
                </div>
              </div>
            </div>

            <ADivider style="margin: 12px 0" />

            <AForm layout="vertical" :model="mfaForm" @finish="handleEnableMfa">
              <AFormItem
                label="Nhập mã OTP 6 chữ số từ ứng dụng Authenticator để kích hoạt"
                name="otp_code"
                :rules="[
                  { required: true, message: 'Vui lòng nhập mã OTP' },
                  { len: 6, message: 'Mã OTP gồm đúng 6 chữ số' },
                ]"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <AInput
                    v-model:value="mfaForm.otp_code"
                    :maxlength="6"
                    placeholder="123456"
                    class="!w-48 font-mono tracking-widest"
                    size="large"
                  />
                  <AButton type="primary" html-type="submit" size="large" :loading="mfaLoading">
                    Kích hoạt MFA
                  </AButton>
                  <AButton size="large" @click="mfaSetup = null">Hủy</AButton>
                </div>
              </AFormItem>
            </AForm>
          </div>
        </template>

        <!-- MFA đang bật -> Tắt MFA -->
        <template v-else>
          <AAlert
            type="success"
            show-icon
            title="Xác thực 2 lớp (MFA / TOTP) đang được kích hoạt trên tài khoản của bạn."
          />

          <div class="rounded-xl border border-red-200/80 bg-red-50/40 p-4">
            <div class="mb-2 font-semibold text-red-700">Tắt bảo mật 2 lớp (MFA)</div>
            <p class="mb-4 text-xs text-slate-600">
              Nhập mã OTP hiện tại từ ứng dụng Authenticator để xác nhận tắt MFA.
            </p>
            <AForm layout="vertical" :model="mfaForm" @finish="handleDisableMfa">
              <AFormItem
                label="Mã xác thực OTP"
                name="otp_code"
                :rules="[
                  { required: true, message: 'Vui lòng nhập mã OTP' },
                  { len: 6, message: 'Mã OTP gồm đúng 6 chữ số' },
                ]"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <AInput
                    v-model:value="mfaForm.otp_code"
                    :maxlength="6"
                    placeholder="123456"
                    class="!w-48 font-mono tracking-widest"
                    size="large"
                  />
                  <AButton danger type="primary" html-type="submit" size="large" :loading="mfaLoading">
                    Xác nhận tắt MFA
                  </AButton>
                </div>
              </AFormItem>
            </AForm>
          </div>
        </template>
      </div>
    </ACard>
  </div>
</template>

<script setup lang="ts">
import { h } from "vue";
import { Tag, message } from "antdv-next";
import type { DescriptionsItemType, TabsProps } from "antdv-next";
import type { MFASetupOutput } from "~/types/api/auth";

useHead({
  title: "Hồ sơ cá nhân | School ERP Platform",
});

const route = useRoute();
const router = useRouter();
const { user, roles, permissions, fetchMe } = useAuth();
const { platformMeMfaSetup, platformMeMfaEnable, platformMeMfaDisable } = useApi();
const { extractApiData, handleApiError } = useApiError();

const VALID_TABS = ["info", "password", "mfa"] as const;
type TabKey = (typeof VALID_TABS)[number];

const resolveTabFromQuery = (): TabKey => {
  const q = typeof route.query.tab === "string" ? route.query.tab : "";
  return VALID_TABS.includes(q as TabKey) ? (q as TabKey) : "info";
};

const activeTab = ref<TabKey>(resolveTabFromQuery());

watch(
  () => route.query.tab,
  () => {
    activeTab.value = resolveTabFromQuery();
  },
);

const handleTabChange = (key: string) => {
  router.replace({ query: { ...route.query, tab: key } });
};

const tabItems: TabsProps["items"] = [
  { key: "info", label: "Thông tin tài khoản" },
  { key: "password", label: "Đổi mật khẩu" },
  { key: "mfa", label: "Bảo mật 2 lớp (MFA)" },
];

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString("vi-VN");
};

const profileItems = computed<DescriptionsItemType[]>(() => [
  { key: "full_name", label: "Họ và tên", content: user.value?.full_name || "—" },
  { key: "email", label: "Email", content: user.value?.email || "—" },
  { key: "phone", label: "Số điện thoại", content: user.value?.phone || "—" },
  {
    key: "status",
    label: "Trạng thái",
    content: () =>
      h(
        Tag,
        { color: user.value?.status === "ACTIVE" ? "success" : "default" },
        () => user.value?.status || "—",
      ),
  },
  {
    key: "mfa",
    label: "Xác thực 2 lớp (MFA)",
    content: () =>
      h(
        Tag,
        { color: user.value?.mfa_enabled ? "green" : "default" },
        () => (user.value?.mfa_enabled ? "Đã bật" : "Chưa bật"),
      ),
  },
  { key: "last_login_at", label: "Đăng nhập gần nhất", content: formatDateTime(user.value?.last_login_at) },
  { key: "created_at", label: "Ngày tạo tài khoản", content: formatDateTime(user.value?.created_at) },
  { key: "id", label: "ID tài khoản", content: user.value?.id || "—" },
]);

const refreshingMe = ref(false);
const handleRefreshProfile = async () => {
  refreshingMe.value = true;
  try {
    await fetchMe(true);
    message.success("Đã cập nhật thông tin tài khoản!");
  } finally {
    refreshingMe.value = false;
  }
};

// MFA (TOTP)
const mfaLoading = ref(false);
const mfaSetup = ref<MFASetupOutput | null>(null);
const mfaForm = reactive({ otp_code: "" });

const copySecret = async (secret?: string) => {
  if (!secret || !import.meta.client) return;
  await navigator.clipboard.writeText(secret);
  message.success("Đã sao chép khóa bí mật!");
};

const handleSetupMfa = async () => {
  mfaLoading.value = true;
  try {
    const { data, error } = await platformMeMfaSetup.post({});
    if (handleApiError(data, error, "Khởi tạo khóa MFA thất bại!")) return;

    mfaSetup.value = (extractApiData(data) as MFASetupOutput) ?? null;
    mfaForm.otp_code = "";
  } finally {
    mfaLoading.value = false;
  }
};

const handleEnableMfa = async () => {
  mfaLoading.value = true;
  try {
    const { data, error } = await platformMeMfaEnable.post({
      otp_code: mfaForm.otp_code.trim(),
    });
    if (handleApiError(data, error, "Kích hoạt MFA thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Đã kích hoạt MFA thành công!");
    mfaSetup.value = null;
    mfaForm.otp_code = "";
    await fetchMe(true);
  } finally {
    mfaLoading.value = false;
  }
};

const handleDisableMfa = async () => {
  mfaLoading.value = true;
  try {
    const { data, error } = await platformMeMfaDisable.post({
      otp_code: mfaForm.otp_code.trim(),
    });
    if (handleApiError(data, error, "Tắt MFA thất bại!")) return;

    message.success((unref(data) as { message?: string } | null)?.message || "Đã tắt MFA!");
    mfaForm.otp_code = "";
    await fetchMe(true);
  } finally {
    mfaLoading.value = false;
  }
};
</script>
