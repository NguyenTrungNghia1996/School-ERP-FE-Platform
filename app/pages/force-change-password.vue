<template>
  <div class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-100 p-4">
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>

    <div class="relative z-10 w-full max-w-md">
      <ACard class="!rounded-2xl !border-slate-200/80 shadow-xl">
        <div class="mb-5 flex flex-col items-center text-center">
          <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Icon name="ant-design:safety-outlined" class="text-2xl" />
          </div>
          <ATypographyTitle :level="4" style="margin-bottom: 4px">
            Đổi mật khẩu bắt buộc
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            {{ user?.email || "Tài khoản quản trị" }}
          </ATypographyText>
        </div>

        <AAlert
          type="warning"
          show-icon
          class="mb-5"
          title="Vui lòng đổi mật khẩu mới để tiếp tục sử dụng hệ thống."
        />

        <ProfileChangePasswordForm
          submit-text="Đổi mật khẩu & Tiếp tục"
          :block-submit="true"
          @success="handlePasswordChanged"
        />

        <div class="mt-4 text-center">
          <AButton type="link" danger size="small" @click="logout">
            Đăng xuất khỏi tài khoản này
          </AButton>
        </div>
      </ACard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

useHead({
  title: "Đổi mật khẩu bắt buộc | School ERP Platform",
});

const { user, fetchMe, logout } = useAuth();

const handlePasswordChanged = async () => {
  await fetchMe(true);
  await navigateTo("/dashboard");
};
</script>
