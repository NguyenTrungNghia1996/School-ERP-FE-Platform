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
      <ACol :xs="24" :sm="12" :lg="6">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Vai trò được gán" :value="roles.length">
            <template #prefix>
              <TeamOutlined class="text-blue-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
      <ACol :xs="24" :sm="12" :lg="6">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Quyền hạn hiệu lực" :value="permissions.length">
            <template #prefix>
              <SafetyCertificateOutlined class="text-emerald-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
      <ACol :xs="24" :sm="12" :lg="6">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <AStatistic title="Danh mục chức năng" :value="visibleMenu.length">
            <template #prefix>
              <AppstoreOutlined class="text-indigo-600" />
            </template>
          </AStatistic>
        </ACard>
      </ACol>
      <ACol :xs="24" :sm="12" :lg="6">
        <ACard size="small" class="!rounded-xl !border-slate-200/80">
          <ClientOnly>
            <AStatistic
              title="Trạng thái API"
              :value="healthError ? 'Lỗi kết nối' : healthData?.status || 'ok'"
              :value-style="{ color: healthError ? '#dc2626' : '#16a34a' }"
            >
              <template #prefix>
                <CheckCircleOutlined v-if="!healthError" />
                <CloseCircleOutlined v-else />
              </template>
            </AStatistic>
            <template #fallback>
              <div class="text-xs text-slate-400">Trạng thái API: Đang tải...</div>
            </template>
          </ClientOnly>
        </ACard>
      </ACol>
    </ARow>

    <!-- Quick Navigation & System Health -->
    <ARow :gutter="[16, 16]">
      <ACol :xs="24" :lg="14">
        <ACard title="Truy cập nhanh chức năng" class="h-full !rounded-xl !border-slate-200/80">
          <div v-if="quickLinks.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </ACol>

      <ACol :xs="24" :lg="10">
        <ACard title="Kiểm tra trạng thái hệ thống" class="h-full !rounded-xl !border-slate-200/80">
          <ClientOnly>
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="text-sm text-slate-600">Kết quả SSR:</span>
                <ATag v-if="loading" color="processing">Đang kiểm tra...</ATag>
                <ATag v-else-if="healthError" color="error">Lỗi kết nối</ATag>
                <ATag v-else color="success">{{ healthData?.status || "ok" }}</ATag>
              </div>

              <div v-if="healthResponse" class="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <pre class="m-0 overflow-auto">{{ healthResponse }}</pre>
              </div>

              <ASpace wrap>
                <AButton :loading="loading" @click="() => checkHealth()">
                  Làm mới SSR
                </AButton>
                <AButton type="primary" :loading="isChecking" @click="handleCheckHealth">
                  Kiểm tra Health Check
                </AButton>
              </ASpace>
            </div>
          </ClientOnly>
        </ACard>
      </ACol>
    </ARow>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { AntDMenuNode } from "~/types/api/auth";

useHead({
  title: "Dashboard | School ERP",
});

const { user, roles, permissions } = useAuth();
const { visibleMenu, resolveIconName } = useMenu();
const { health: healthApi } = useApi();
const { handleApiError, extractApiData } = useApiError();

const flattenLinks = (nodes: AntDMenuNode[]): AntDMenuNode[] =>
  nodes.flatMap((n) => [
    ...(n.path ? [n] : []),
    ...(n.children?.length ? flattenLinks(n.children) : []),
  ]);

const quickLinks = computed(() => flattenLinks(visibleMenu.value).slice(0, 6));

const {
  data: healthResponse,
  pending: loading,
  refresh: checkHealth,
  error: healthError,
} = await healthApi.get({
  key: "system-health-check",
});

const healthData = computed(() => extractApiData(healthResponse) as { status?: string } | null);

watch(
  () => unref(healthError),
  (err) => {
    if (err) {
      handleApiError(null, err, "Không thể kết nối đến máy chủ!");
    }
  },
);

const isChecking = ref(false);
const handleCheckHealth = async () => {
  isChecking.value = true;
  try {
    const { data: resData, error: apiErr } = await healthApi.getClient();
    if (handleApiError(resData, apiErr, "Kiểm tra hệ thống thất bại!")) {
      return;
    }
    const payload = extractApiData(resData) as { message?: string } | null;
    message.success((unref(resData) as { message?: string } | null)?.message || payload?.message || "Hệ thống hoạt động bình thường!");
  } finally {
    isChecking.value = false;
  }
};
</script>
