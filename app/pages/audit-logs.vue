<template>
  <div class="space-y-4">
    <!-- Filter Bar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Nhật ký Kiểm toán (Audit Logs)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Tra cứu lịch sử thao tác quản trị trên toàn nền tảng và các phiên hỗ trợ
          </ATypographyText>
        </div>

        <AButton :loading="pending" @click="() => refresh()">
          <template #icon><Icon name="ant-design:reload-outlined" /></template>
          Làm mới
        </AButton>
      </div>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <AInput
          v-model:value="filters.action"
          placeholder="Hành động (Action)..."
          allow-clear
          @press-enter="applyFilters"
        />
        <AInput
          v-model:value="filters.resource_type"
          placeholder="Loại tài nguyên..."
          allow-clear
          @press-enter="applyFilters"
        />
        <AInput
          v-model:value="filters.actor_type"
          placeholder="Loại actor..."
          allow-clear
          @press-enter="applyFilters"
        />
        <AInput
          v-model:value="filters.actor_id"
          placeholder="Actor ID..."
          allow-clear
          class="font-mono"
          @press-enter="applyFilters"
        />
        <div class="flex gap-2">
          <AInput
            v-model:value="filters.organization_id"
            placeholder="Organization ID..."
            allow-clear
            class="font-mono"
            @press-enter="applyFilters"
          />
          <AButton type="primary" @click="applyFilters">Lọc</AButton>
        </div>
      </div>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="logs"
          :loading="pending"
          :pagination="{
            current: pagination.page,
            pageSize: pagination.limit,
            total: total,
            showSizeChanger: true,
            showTotal: (t: number) => `Tổng ${t} bản ghi`,
          }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1100 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              <span class="text-xs text-slate-700">{{ formatDateTime(record.created_at) }}</span>
            </template>

            <template v-else-if="column.key === 'actor'">
              <ATag color="blue" class="text-[11px]">{{ record.actor_type || "—" }}</ATag>
              <div class="mt-0.5 font-mono text-[11px] text-slate-500">{{ record.actor_id || "—" }}</div>
            </template>

            <template v-else-if="column.key === 'action'">
              <ATag color="geekblue" class="font-mono text-xs">{{ record.action || "—" }}</ATag>
            </template>

            <template v-else-if="column.key === 'resource'">
              <div class="font-medium text-slate-800">{{ record.resource_type || "—" }}</div>
              <div class="font-mono text-[11px] text-slate-500">{{ record.resource_id || "—" }}</div>
            </template>

            <template v-else-if="column.key === 'ip_address'">
              <span class="font-mono text-xs text-slate-600">{{ record.ip_address || "—" }}</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <AButton size="small" @click="openDetail(record)">
                <template #icon><Icon name="ant-design:eye-outlined" /></template>
                Chi tiết
              </AButton>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Drawer Chi tiết Audit Log -->
    <ADrawer v-model:open="drawerOpen" title="Chi tiết Nhật ký Kiểm toán" :width="680">
      <div v-if="selectedLog" class="space-y-4">
        <ADescriptions bordered size="small" :column="1" :items="detailItems" />

        <div>
          <div class="mb-1.5 text-xs font-semibold text-slate-700">Dữ liệu trước thay đổi (Before Data)</div>
          <pre class="max-h-56 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{{
            selectedLog.before_data ? JSON.stringify(selectedLog.before_data, null, 2) : "null"
          }}</pre>
        </div>

        <div>
          <div class="mb-1.5 text-xs font-semibold text-slate-700">Dữ liệu sau thay đổi (After Data)</div>
          <pre class="max-h-56 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{{
            selectedLog.after_data ? JSON.stringify(selectedLog.after_data, null, 2) : "null"
          }}</pre>
        </div>
      </div>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import type { DescriptionsItemType, TableProps } from "antdv-next";
import type { AuditLog } from "~/types/api/audit";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Nhật ký kiểm toán | School ERP",
});

const { platformAuditLogs } = useApi();
const { extractApiData, handleApiError } = useApiError();

const filters = reactive({
  action: "",
  resource_type: "",
  actor_type: "",
  actor_id: "",
  organization_id: "",
});

const appliedFilters = reactive({ ...filters });
const pagination = reactive({ page: 1, limit: 20 });

const queryParams = computed(() => ({
  page: pagination.page,
  limit: pagination.limit,
  ...(appliedFilters.action ? { action: appliedFilters.action } : {}),
  ...(appliedFilters.resource_type ? { resource_type: appliedFilters.resource_type } : {}),
  ...(appliedFilters.actor_type ? { actor_type: appliedFilters.actor_type } : {}),
  ...(appliedFilters.actor_id ? { actor_id: appliedFilters.actor_id } : {}),
  ...(appliedFilters.organization_id ? { organization_id: appliedFilters.organization_id } : {}),
}));

const {
  data: logsRes,
  pending,
  refresh,
  error: logsError,
} = await platformAuditLogs.get({
  key: "platform-audit-logs",
  query: queryParams,
});

watch(
  () => unref(logsError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải nhật ký kiểm toán!");
  },
);

const logs = computed<AuditLog[]>(() => {
  const data = extractApiData(logsRes);
  return Array.isArray(data) ? data : [];
});

const total = computed<number>(() => {
  const raw = unref(logsRes) as { meta?: { total?: number } } | null;
  return raw?.meta?.total ?? logs.value.length;
});

const applyFilters = () => {
  appliedFilters.action = filters.action.trim();
  appliedFilters.resource_type = filters.resource_type.trim();
  appliedFilters.actor_type = filters.actor_type.trim();
  appliedFilters.actor_id = filters.actor_id.trim();
  appliedFilters.organization_id = filters.organization_id.trim();
  pagination.page = 1;
};

const handleTableChange: TableProps["onChange"] = (pag) => {
  pagination.page = pag.current || 1;
  pagination.limit = pag.pageSize || 20;
};

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};

const columns: TableProps["columns"] = [
  { title: "Thời gian", key: "created_at", width: 170 },
  { title: "Actor", key: "actor", width: 220 },
  { title: "Hành động", key: "action", width: 180 },
  { title: "Tài nguyên", key: "resource", width: 220 },
  { title: "IP", key: "ip_address", width: 130 },
  { title: "Lý do", dataIndex: "reason", key: "reason" },
  { title: "Chi tiết", key: "actions", width: 100, fixed: "right" },
];

// Drawer
const drawerOpen = ref(false);
const selectedLog = ref<AuditLog | null>(null);

const openDetail = (record: AuditLog) => {
  selectedLog.value = record;
  drawerOpen.value = true;
};

const detailItems = computed<DescriptionsItemType[]>(() => [
  { key: "id", label: "Log ID", content: selectedLog.value?.id || "—" },
  { key: "time", label: "Thời gian", content: formatDateTime(selectedLog.value?.created_at) },
  {
    key: "actor",
    label: "Actor",
    content: `${selectedLog.value?.actor_type || "—"} (${selectedLog.value?.actor_id || "—"})`,
  },
  { key: "action", label: "Hành động", content: selectedLog.value?.action || "—" },
  {
    key: "resource",
    label: "Tài nguyên",
    content: `${selectedLog.value?.resource_type || "—"} / ${selectedLog.value?.resource_id || "—"}`,
  },
  { key: "org", label: "Organization ID", content: selectedLog.value?.organization_id || "—" },
  { key: "school", label: "School ID", content: selectedLog.value?.school_id || "—" },
  { key: "support", label: "Support Session ID", content: selectedLog.value?.support_session_id || "—" },
  { key: "reason", label: "Lý do", content: selectedLog.value?.reason || "—" },
  { key: "ip", label: "IP Address", content: selectedLog.value?.ip_address || "—" },
  { key: "ua", label: "User Agent", content: selectedLog.value?.user_agent || "—" },
]);
</script>
