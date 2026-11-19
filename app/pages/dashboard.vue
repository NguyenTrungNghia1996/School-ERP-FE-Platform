<template>
  <div class="space-y-4">
    <!-- Welcome Banner + System Health -->
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
          <ATag :color="healthOk ? 'success' : 'error'" class="px-2.5 py-0.5 text-xs">
            <template #icon>
              <Icon :name="healthOk ? 'ant-design:check-circle-outlined' : 'ant-design:exclamation-circle-outlined'" />
            </template>
            Hệ thống: {{ healthLabel }}
          </ATag>
          <ATag v-for="role in roles" :key="role" color="blue">{{ role }}</ATag>
          <AButton size="small" :loading="refreshingStats" @click="reloadDashboard">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Platform Stats (GET /v1/platform/dashboard/stats) -->
    <ARow :gutter="[16, 16]">
      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Tổng Tổ chức" :value="stats?.organizations?.total ?? 0">
            <template #prefix><Icon name="ant-design:bank-outlined" class="text-blue-600" /></template>
          </AStatistic>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
            <ATag color="success">Active: {{ stats?.organizations?.active ?? 0 }}</ATag>
            <ATag color="processing">Chờ duyệt: {{ stats?.organizations?.pending_approval ?? 0 }}</ATag>
            <ATag color="error">DNS lỗi: {{ stats?.organizations?.dns_failed ?? 0 }}</ATag>
            <ATag v-if="(stats?.organizations?.suspended ?? 0) > 0" color="warning">
              Tạm ngưng: {{ stats?.organizations?.suspended }}
            </ATag>
          </div>
        </ACard>
      </ACol>

      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Gói dịch vụ đang hiệu lực" :value="stats?.subscriptions?.active ?? 0">
            <template #prefix><Icon name="ant-design:code-sandbox-outlined" class="text-indigo-600" /></template>
          </AStatistic>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
            <ATag color="warning">Sắp hết hạn (30d): {{ stats?.subscriptions?.expiring_soon_30d ?? 0 }}</ATag>
            <ATag color="default">Hết hạn: {{ stats?.subscriptions?.expired ?? 0 }}</ATag>
          </div>
        </ACard>
      </ACol>

      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Tổng Trường học" :value="stats?.schools_total ?? 0">
            <template #prefix><Icon name="ant-design:apartment-outlined" class="text-cyan-600" /></template>
          </AStatistic>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
            <ATag color="blue">
              Nhân sự Platform: {{ stats?.platform_users?.active ?? 0 }} / {{ stats?.platform_users?.total ?? 0 }}
            </ATag>
          </div>
        </ACard>
      </ACol>

      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Phiên hỗ trợ (Support)" :value="stats?.support_sessions?.active ?? 0">
            <template #prefix><Icon name="ant-design:customer-service-outlined" class="text-emerald-600" /></template>
          </AStatistic>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
            <ATag color="orange">Chờ duyệt: {{ stats?.support_sessions?.pending ?? 0 }}</ATag>
          </div>
        </ACard>
      </ACol>

      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Lưu trữ Media (Tệp)" :value="stats?.storage?.total_files ?? 0">
            <template #prefix><Icon name="ant-design:cloud-server-outlined" class="text-sky-600" /></template>
          </AStatistic>
          <div class="mt-2 text-xs text-slate-500">
            Dung lượng đã dùng: <span class="font-semibold text-slate-700">{{ formatBytes(stats?.storage?.total_used_bytes) }}</span>
          </div>
        </ACard>
      </ACol>

      <ACol :xs="24" :sm="12" :lg="8">
        <ACard size="small" class="h-full !rounded-xl !border-slate-200/80">
          <AStatistic title="Quyền hạn cá nhân" :value="permissions.length">
            <template #prefix><Icon name="ant-design:safety-certificate-outlined" class="text-violet-600" /></template>
          </AStatistic>
          <div class="mt-2 text-xs text-slate-500">
            Vai trò: {{ roles.length }} • Danh mục menu: {{ visibleMenu.length }}
          </div>
        </ACard>
      </ACol>
    </ARow>

    <!-- Health Check Details (GET /health) -->
    <ACard v-if="healthDetails" size="small" title="Trạng thái dịch vụ hệ thống (/health)" class="!rounded-xl !border-slate-200/80">
      <div class="flex flex-wrap gap-3 text-xs">
        <div
          v-for="(val, key) in healthEntries"
          :key="key"
          class="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5"
        >
          <span class="font-mono font-semibold text-slate-700">{{ key }}:</span>
          <ATag :color="isHealthyValue(val) ? 'success' : 'default'" class="!m-0">
            {{ typeof val === "object" ? JSON.stringify(val) : String(val) }}
          </ATag>
        </div>
      </div>
    </ACard>

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
import type { DashboardStatsOutput } from "~/types/api/tenant";

useHead({
  title: "Dashboard | School ERP",
});

const { user, roles, permissions } = useAuth();
const { visibleMenu, resolveIconName } = useMenu();
const { platformDashboardStats, health } = useApi();
const { extractApiData, handleApiError } = useApiError();

const { data: statsRes, pending: statsPending, refresh: refreshStats, error: statsError } =
  await platformDashboardStats.get({ key: "platform-dashboard-stats" });

const { data: healthRes, pending: healthPending, refresh: refreshHealth, error: healthError } =
  await health.get({ key: "platform-health" });

watch(
  () => unref(statsError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải thống kê Dashboard!");
  },
);

const refreshingStats = computed(() => statsPending.value || healthPending.value);

const reloadDashboard = async () => {
  await Promise.all([refreshStats(), refreshHealth()]);
};

const stats = computed<DashboardStatsOutput | null>(
  () => (extractApiData(statsRes) as DashboardStatsOutput) ?? null,
);

const healthDetails = computed<Record<string, unknown> | null>(() => {
  const val = unref(healthRes);
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
});

const healthOk = computed(() => !unref(healthError) && Boolean(healthDetails.value));
const healthLabel = computed(() => {
  if (unref(healthError)) return "Lỗi kết nối";
  const status = healthDetails.value?.status;
  return typeof status === "string" && status ? status.toUpperCase() : healthOk.value ? "ONLINE" : "UNKNOWN";
});

const healthEntries = computed(() => {
  if (!healthDetails.value) return {};
  return Object.fromEntries(
    Object.entries(healthDetails.value).filter(([, v]) => v !== undefined && v !== null),
  );
});

const isHealthyValue = (val: unknown) => {
  const s = String(val).toLowerCase();
  return s === "ok" || s === "up" || s === "healthy" || s === "true" || s.includes("ok");
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** idx;
  return `${idx === 0 ? value : value.toFixed(2)} ${units[idx]}`;
};

const flattenLinks = (nodes: AntDMenuNode[]): AntDMenuNode[] =>
  nodes.flatMap((n) => [
    ...(n.path ? [n] : []),
    ...(n.children?.length ? flattenLinks(n.children) : []),
  ]);

const quickLinks = computed(() => flattenLinks(visibleMenu.value).slice(0, 6));
</script>
