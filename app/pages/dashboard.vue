<template>
  <div class="space-y-4">
    <!-- Welcome Banner -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div class="space-y-1">
          <ATypographyTitle :level="4" style="margin: 0">
            Xin chào, {{ user?.full_name || user?.email || "Quản trị viên" }}
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Bảng điều khiển tổng quan hệ thống quản trị nền tảng School ERP
          </ATypographyText>
        </div>
        <ASpace wrap>
          <ATag v-for="role in roles" :key="role" color="blue">{{ role }}</ATag>
          <ATag v-if="user?.status" :color="user.status === 'ACTIVE' ? 'success' : 'default'">
            {{ user.status }}
          </ATag>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Statistics -->
    <ARow :gutter="[16, 16]">
      <ACol :xs="24" :sm="8">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Vai trò được gán" :value="roles.length">
            <template #prefix>
              <TeamOutlined class="text-blue-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
      <ACol :xs="24" :sm="8">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Quyền hạn hiệu lực" :value="permissions.length">
            <template #prefix>
              <SafetyCertificateOutlined class="text-emerald-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
      <ACol :xs="24" :sm="8">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Danh mục chức năng" :value="visibleMenu.length">
            <template #prefix>
              <AppstoreOutlined class="text-indigo-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
    </ARow>

    <!-- Quick Navigation -->
    <ACard title="Truy cập nhanh chức năng" class="!rounded-xl !border-slate-200/80">
      <div v-if="quickLinks.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in quickLinks"
          :key="item.path"
          class="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 p-3 transition hover:border-blue-400 hover:bg-blue-50/40"
          @click="navigateTo(item.path!)"
        >
          <div class="flex items-center gap-2.5">
            <Icon :name="resolveIconName(item.icon)" class="text-base text-blue-600" />
            <span class="font-medium text-slate-700">{{ item.label }}</span>
          </div>
          <Icon name="ant-design:right-outlined" class="text-xs text-slate-400" />
        </div>
      </div>
      <AEmpty v-else description="Chưa có menu chức năng khả dụng" />
    </ACard>
  </div>
</template>

<script setup lang="ts">
import type { AntDMenuNode } from "~/types/api/auth";

useHead({
  title: "Dashboard | School ERP",
});

const { user, roles, permissions } = useAuth();
const { visibleMenu, resolveIconName } = useMenu();

const flattenLinks = (nodes: AntDMenuNode[]): AntDMenuNode[] =>
  nodes.flatMap((n) => [
    ...(n.path ? [n] : []),
    ...(n.children?.length ? flattenLinks(n.children) : []),
  ]);

const quickLinks = computed(() => flattenLinks(visibleMenu.value).slice(0, 6));
</script>
