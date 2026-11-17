<template>
  <header class="relative flex h-full w-full items-center justify-between border-b border-slate-200/80 bg-white px-3 shadow-xs sm:px-6">
    <!-- Brand Gradient Accent Line -->
    <div class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500"></div>

    <!-- Logo & Title -->
    <div class="flex cursor-pointer items-center gap-3" @click="navigateTo('/dashboard')">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-emerald-500 text-white shadow-xs sm:h-10 sm:w-10">
        <Icon name="ant-design:appstore-outlined" class="text-lg" />
      </div>
      <div class="hidden md:block">
        <div class="text-sm font-bold tracking-tight text-slate-800">SCHOOL ERP PLATFORM</div>
        <div class="text-[11px] font-medium leading-none text-slate-400">Nền tảng Quản trị &amp; Điều hành Trường học Số</div>
      </div>
    </div>

    <!-- User Profile Dropdown -->
    <div class="flex items-center gap-3">
      <ClientOnly>
        <ADropdown :trigger="['click']" :menu="{ items: userMenuItems, onClick: handleUserMenuClick }">
          <div class="flex cursor-pointer items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-50">
            <div class="text-right">
              <div class="text-sm font-semibold text-slate-800 hover:text-blue-600">
                {{ userDisplayName }}
              </div>
              <div v-if="userSubtitle" class="text-xs text-slate-500">{{ userSubtitle }}</div>
            </div>
            <AAvatar :src="user?.avatar_url || undefined" class="bg-blue-600 text-white">
              <template #icon>
                <Icon name="ant-design:user-outlined" />
              </template>
            </AAvatar>
          </div>
        </ADropdown>
        <template #fallback>
          <div class="flex items-center gap-3 rounded-xl p-1.5">
            <div class="text-right">
              <div class="text-sm font-semibold text-slate-800">{{ userDisplayName }}</div>
            </div>
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
              <Icon name="ant-design:user-outlined" />
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </header>
</template>

<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { MenuProps } from "antdv-next";

const { user, roles, logout } = useAuth();
const NuxtIcon = resolveComponent("Icon");

const userDisplayName = computed(() => user.value?.full_name || user.value?.email || "Quản trị viên");
const userSubtitle = computed(() => roles.value.join(", ") || user.value?.email || "");

const userMenuItems: MenuProps["items"] = [
  {
    key: "profile",
    label: "Hồ sơ cá nhân",
    icon: () => h(NuxtIcon, { name: "ant-design:user-outlined", class: "text-slate-600 text-base" }),
  },
  {
    key: "change-password",
    label: "Đổi mật khẩu",
    icon: () => h(NuxtIcon, { name: "ant-design:key-outlined", class: "text-blue-500 text-base" }),
  },
  {
    key: "mfa",
    label: "Bảo mật 2 lớp (MFA)",
    icon: () => h(NuxtIcon, { name: "ant-design:safety-certificate-outlined", class: "text-emerald-600 text-base" }),
  },
  { type: "divider" },
  {
    key: "logout",
    label: "Đăng xuất",
    danger: true,
    icon: () => h(NuxtIcon, { name: "ant-design:logout-outlined", class: "text-red-500 text-base" }),
  },
];

const handleUserMenuClick: MenuProps["onClick"] = async ({ key }) => {
  if (key === "logout") {
    await logout();
    return;
  }
  if (key === "profile") {
    await navigateTo("/profile");
    return;
  }
  if (key === "change-password") {
    await navigateTo("/profile?tab=password");
    return;
  }
  if (key === "mfa") {
    await navigateTo("/profile?tab=mfa");
  }
};
</script>
