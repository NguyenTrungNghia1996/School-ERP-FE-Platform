<template>
  <div class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-100 p-4">
    <!-- Subtle Background Accent -->
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"></div>

    <div class="relative z-10 w-full max-w-md">
      <ACard class="!rounded-2xl !border-slate-200/80 shadow-xl">
        <!-- Brand Header -->
        <div class="mb-6 flex flex-col items-center text-center">
          <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-emerald-500 text-white shadow-md">
            <AppstoreOutlined class="text-2xl" />
          </div>
          <ATypographyTitle :level="3" style="margin-bottom: 4px">
            SCHOOL ERP PLATFORM
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Đăng nhập hệ thống Quản trị &amp; Điều hành Nền tảng
          </ATypographyText>
        </div>

        <!-- Login Form -->
        <AForm
          ref="formRef"
          :model="formState"
          :rules="formRules"
          layout="vertical"
          @finish="handleSubmit"
        >
          <AFormItem label="Email" name="email">
            <AInput
              v-model:value="formState.email"
              size="large"
              placeholder="admin@school-erp.vn"
              autocomplete="username"
              allow-clear
            >
              <template #prefix>
                <MailOutlined class="text-slate-400" />
              </template>
            </AInput>
          </AFormItem>

          <AFormItem label="Mật khẩu" name="password">
            <AInputPassword
              v-model:value="formState.password"
              size="large"
              placeholder="Nhập mật khẩu"
              autocomplete="current-password"
            >
              <template #prefix>
                <LockOutlined class="text-slate-400" />
              </template>
            </AInputPassword>
          </AFormItem>

          <div class="mb-4 flex items-center justify-between">
            <ACheckbox v-model:checked="rememberMe">
              <span class="text-xs text-slate-600">Lưu thông tin đăng nhập</span>
            </ACheckbox>
            <button
              type="button"
              class="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-blue-600 hover:underline"
              @click="showOtpField = !showOtpField"
            >
              {{ showOtpField ? "Ẩn mã OTP" : "Nhập mã OTP (MFA)" }}
            </button>
          </div>

          <AFormItem
            v-if="showOtpField"
            label="Mã xác thực OTP 6 chữ số (TOTP)"
            name="otp_code"
            :rules="[{ len: 6, message: 'Mã OTP gồm đúng 6 chữ số' }]"
          >
            <ClientOnly>
              <AInputOtp
                v-model:value="formState.otp_code"
                :length="6"
                size="large"
                input-mode="numeric"
                :formatter="onlyDigits"
              />
            </ClientOnly>
          </AFormItem>

          <AFormItem class="!mb-2">
            <AButton
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="submitting"
            >
              Đăng nhập
            </AButton>
          </AFormItem>
        </AForm>
      </ACard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule } from "antdv-next";
import type { LoginInput } from "~/types/api/auth";

definePageMeta({
  layout: false,
});

useHead({
  title: "Đăng nhập | School ERP Platform",
});

const route = useRoute();
const userStore = useUserStore();
const rememberedEmailCookie = useCookie<string | null>("remember_email", {
  maxAge: 60 * 60 * 24 * 30,
});

const formRef = ref<FormInstance>();
const submitting = ref(false);
const rememberMe = ref(Boolean(rememberedEmailCookie.value));
const showOtpField = ref(false);
const onlyDigits = (val: string) => val.replace(/\D/g, "");

const formState = reactive<LoginInput>({
  email: rememberedEmailCookie.value || "",
  password: "",
  otp_code: "",
});

const formRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: "Vui lòng nhập email", trigger: "blur" },
    { type: "email", message: "Email không đúng định dạng", trigger: "blur" },
  ],
  password: [{ required: true, message: "Vui lòng nhập mật khẩu", trigger: "blur" }],
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const email = formState.email.trim();
    const ok = await userStore.login(
      {
        email,
        password: formState.password,
        ...(formState.otp_code?.trim() ? { otp_code: formState.otp_code.trim() } : {}),
      },
      rememberMe.value,
    );
    if (!ok) return;

    rememberedEmailCookie.value = rememberMe.value ? email : null;

    message.success("Đăng nhập thành công!");
    if (userStore.mustChangePassword) {
      await navigateTo("/force-change-password");
      return;
    }
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/dashboard";
    await navigateTo(redirect);
  } finally {
    submitting.value = false;
  }
};
</script>
