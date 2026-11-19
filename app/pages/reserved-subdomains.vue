<template>
  <div class="space-y-4">
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Subdomain Giữ chỗ (Reserved Subdomains)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Quản lý danh sách các từ khóa hệ thống không cho phép Tổ chức đăng ký làm subdomain
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchQuery"
            placeholder="Tìm từ khóa hoặc lý do..."
            allow-clear
            class="w-60"
          >
            <template #prefix><Icon name="ant-design:search-outlined" class="text-slate-400" /></template>
          </AInput>

          <AButton :loading="pending" @click="() => refresh()">
            <template #icon><Icon name="ant-design:reload-outlined" /></template>
            Làm mới
          </AButton>

          <APopconfirm
            title="Đồng bộ các subdomain đang tồn tại trên Cloudflare DNS vào danh sách giữ chỗ?"
            ok-text="Đồng bộ"
            cancel-text="Hủy"
            @confirm="handleSyncCloudflare"
          >
            <AButton :loading="syncingCloudflare">
              <template #icon><Icon name="ant-design:cloud-sync-outlined" /></template>
              Đồng bộ Cloudflare DNS
            </AButton>
          </APopconfirm>

          <AButton type="primary" @click="openModal">
            <template #icon><Icon name="ant-design:plus-outlined" /></template>
            Thêm từ khóa
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Public Tenant Resolve Tester -->
    <ACard size="small" title="Kiểm tra phân giải Subdomain (Public Tenant Resolve)" class="!rounded-xl !border-slate-200/80 shadow-xs">
      <div class="flex flex-wrap items-center gap-3">
        <AInput
          v-model:value="resolveInput"
          placeholder="Nhập subdomain cần kiểm tra (VD: thpt-nguyen-du)"
          class="w-72 font-mono"
          @press-enter="handleResolveTenant"
        />
        <AButton :loading="resolving" @click="handleResolveTenant">
          <template #icon><Icon name="ant-design:global-outlined" /></template>
          Phân giải Subdomain
        </AButton>
        <div v-if="resolveResult" class="flex-1 rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
          {{ JSON.stringify(resolveResult) }}
        </div>
      </div>
    </ACard>

    <!-- Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="filteredKeywords"
          :loading="pending"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          row-key="keyword"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'keyword'">
              <ATag color="volcano" class="font-mono text-xs">{{ record.keyword }}</ATag>
            </template>
            <template v-else-if="column.key === 'created_at'">
              <span class="text-xs text-slate-600">{{ formatDateTime(record.created_at) }}</span>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <AModal
      v-model:open="modalOpen"
      title="Thêm từ khóa Subdomain giữ chỗ"
      :confirm-loading="submitting"
      ok-text="Thêm từ khóa"
      cancel-text="Hủy"
      @ok="submitCreate"
    >
      <AForm ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="mt-3">
        <AFormItem label="Từ khóa (Keyword)" name="keyword">
          <AInput v-model:value="formState.keyword" placeholder="admin, www, portal..." class="font-mono" />
        </AFormItem>
        <AFormItem label="Lý do giữ chỗ" name="reason">
          <ATextarea v-model:value="formState.reason" :rows="3" placeholder="Dành cho hệ thống nội bộ" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import type { ReservedSubdomain } from "~/types/api/tenant";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Subdomain giữ chỗ | School ERP",
});

const { platformReservedSubdomains, platformReservedSubdomainsSyncCloudflare, publicTenantResolve } = useApi();
const { extractApiData, handleApiError } = useApiError();

const {
  data: reservedRes,
  pending,
  refresh,
  error: reservedError,
} = await platformReservedSubdomains.get({
  key: "reserved-subdomains-list",
});

watch(
  () => unref(reservedError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải danh sách subdomain giữ chỗ!");
  },
);

const searchQuery = ref("");
const keywords = computed<ReservedSubdomain[]>(() => {
  const data = extractApiData(reservedRes);
  return Array.isArray(data) ? data : [];
});

const filteredKeywords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return keywords.value;
  return keywords.value.filter(
    (k) =>
      k.keyword?.toLowerCase().includes(q) ||
      k.reason?.toLowerCase().includes(q),
  );
});

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};

const columns: TableProps["columns"] = [
  { title: "Từ khóa", key: "keyword", width: 200 },
  { title: "Lý do giữ chỗ", dataIndex: "reason", key: "reason" },
  { title: "Người tạo", dataIndex: "created_by", key: "created_by", width: 200 },
  { title: "Ngày tạo", key: "created_at", width: 180 },
];

// Sync Cloudflare DNS
const syncingCloudflare = ref(false);

const handleSyncCloudflare = async () => {
  syncingCloudflare.value = true;
  try {
    const { data, error } = await platformReservedSubdomainsSyncCloudflare.post(undefined);
    if (handleApiError(data, error, "Đồng bộ từ Cloudflare DNS thất bại!")) return;

    message.success(unref(data)?.message || "Đã đồng bộ subdomain từ Cloudflare DNS!");
    await refresh();
  } finally {
    syncingCloudflare.value = false;
  }
};

// Create
const modalOpen = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const formState = reactive({ keyword: "", reason: "" });
const formRules: Record<string, Rule[]> = {
  keyword: [{ required: true, message: "Vui lòng nhập từ khóa subdomain", trigger: "blur" }],
};

const openModal = () => {
  formState.keyword = "";
  formState.reason = "";
  modalOpen.value = true;
};

const submitCreate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const { data, error } = await platformReservedSubdomains.post({
      keyword: formState.keyword.trim().toLowerCase(),
      reason: formState.reason.trim(),
    });
    if (handleApiError(data, error, "Thêm từ khóa thất bại!")) return;

    message.success("Đã thêm từ khóa subdomain giữ chỗ!");
    modalOpen.value = false;
    await refresh();
  } finally {
    submitting.value = false;
  }
};

// Public Tenant Resolve tester
const resolveInput = ref("");
const resolving = ref(false);
const resolveResult = ref<unknown>(null);

const handleResolveTenant = async () => {
  if (!resolveInput.value.trim()) {
    message.warning("Vui lòng nhập subdomain cần kiểm tra");
    return;
  }
  resolving.value = true;
  try {
    const { data, error } = await publicTenantResolve.getClient({
      query: { subdomain: resolveInput.value.trim() },
    });
    if (handleApiError(data, error, "Không phân giải được subdomain!")) {
      resolveResult.value = null;
      return;
    }
    resolveResult.value = extractApiData(data);
  } finally {
    resolving.value = false;
  }
};
</script>
