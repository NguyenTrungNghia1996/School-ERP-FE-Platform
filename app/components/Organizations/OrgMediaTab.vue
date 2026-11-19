<template>
  <div class="space-y-4">
    <!-- Thống kê dung lượng lưu trữ (GET /v1/platform/organizations/{org_id}/storage/usage) -->
    <div v-if="orgId" class="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Icon name="ant-design:cloud-server-outlined" class="text-blue-600" />
            <span>Dung lượng lưu trữ (R2/S3)</span>
            <ATag v-if="usage?.folder_prefix" class="font-mono text-[11px]">
              {{ usage.folder_prefix }}
            </ATag>
          </div>
          <div class="text-xs text-slate-500">
            Đã dùng
            <span class="font-semibold text-slate-700">{{ formatBytes(usage?.used_bytes) }}</span>
            / {{ formatBytes(usage?.quota_bytes) }}
            <span v-if="usage?.remaining_bytes !== undefined">
              (còn lại {{ formatBytes(usage.remaining_bytes) }})
            </span>
            • {{ usage?.file_count ?? 0 }} tệp
          </div>
        </div>

        <div class="w-full sm:w-56">
          <div class="mb-1 flex justify-between text-xs text-slate-600">
            <span>Mức sử dụng</span>
            <span class="font-semibold">{{ (usage?.usage_percent ?? 0).toFixed(1) }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full transition-all"
              :class="(usage?.usage_percent ?? 0) >= 90 ? 'bg-red-500' : 'bg-blue-600'"
              :style="{ width: `${Math.min(100, Math.max(0, usage?.usage_percent ?? 0))}%` }"
            />
          </div>
        </div>
      </AFlex>
    </div>

    <!-- Thanh công cụ -->
    <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
      <ASpace wrap>
        <ARadioGroup v-model:value="viewMode" button-style="solid" @change="onViewModeChange">
          <ARadioButton value="active">Tệp đang lưu trữ</ARadioButton>
          <ARadioButton value="trash">Thùng rác</ARadioButton>
        </ARadioGroup>

        <AInput
          v-if="viewMode === 'active'"
          v-model:value="folderFilter"
          placeholder="Lọc theo thư mục (VD: logos, avatars)"
          allow-clear
          class="w-64"
          @press-enter="handleFolderFilter"
          @change="() => !folderFilter && handleFolderFilter()"
        >
          <template #prefix><Icon name="ant-design:folder-outlined" class="text-slate-400" /></template>
        </AInput>
      </ASpace>

      <ASpace wrap>
        <AButton :loading="loading" @click="loadAll">
          <template #icon><Icon name="ant-design:reload-outlined" /></template>
          Làm mới
        </AButton>
        <AButton v-if="viewMode === 'active'" type="primary" @click="openUploadModal">
          <template #icon><Icon name="ant-design:upload-outlined" /></template>
          Tải tệp lên
        </AButton>
      </ASpace>
    </AFlex>

    <!-- Bảng danh sách tệp / thùng rác -->
    <ClientOnly>
      <ATable
        :columns="columns"
        :data-source="files"
        :loading="loading"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (t: number) => `Tổng ${t} tệp`,
        }"
        row-key="id"
        size="small"
        :scroll="{ x: 900 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'file'">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                <img
                  v-if="isImageMime(record.mime_type) && (record.access_url || record.public_url)"
                  :src="record.access_url || record.public_url"
                  :alt="record.original_name || 'preview'"
                  class="h-full w-full object-cover"
                />
                <Icon v-else name="ant-design:file-outlined" class="text-lg text-slate-400" />
              </div>
              <div class="min-w-0">
                <div class="truncate font-medium text-slate-800" :title="record.original_name">
                  {{ record.original_name || "—" }}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <ATag v-if="record.folder" color="blue" class="!m-0 !text-[10px]">{{ record.folder }}</ATag>
                  <span>{{ record.mime_type || "—" }}</span>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'access_url'">
            <div v-if="record.access_url || record.public_url" class="flex items-center gap-1.5">
              <a
                :href="record.access_url || record.public_url"
                target="_blank"
                rel="noopener noreferrer"
                class="max-w-xs truncate font-mono text-xs text-blue-600 hover:underline"
              >
                {{ record.access_url || record.public_url }}
              </a>
              <AButton
                size="small"
                type="text"
                title="Sao chép access_url"
                @click="copyUrl(record.access_url || record.public_url)"
              >
                <template #icon><Icon name="ant-design:copy-outlined" /></template>
              </AButton>
            </div>
            <span v-else class="text-xs text-slate-400">—</span>
          </template>

          <template v-else-if="column.key === 'size'">
            <span class="text-xs text-slate-700">{{ formatBytes(record.size_bytes) }}</span>
          </template>

          <template v-else-if="column.key === 'time'">
            <span class="text-xs text-slate-600">
              {{ formatDateTime(viewMode === "trash" ? record.deleted_at : record.created_at) }}
            </span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <ASpace v-if="viewMode === 'active'" size="small">
              <AButton size="small" :loading="rowActionId === record.id" @click="handleFetchAccessUrl(record)">
                Lấy URL
              </AButton>
              <APopconfirm
                v-if="record.access_url"
                title="Chuyển tệp này vào thùng rác?"
                ok-text="Xóa"
                cancel-text="Hủy"
                @confirm="handleSoftDelete(record)"
              >
                <AButton size="small" danger :loading="rowActionId === record.id">Xóa</AButton>
              </APopconfirm>
            </ASpace>

            <ASpace v-else size="small">
              <AButton size="small" type="primary" ghost :loading="rowActionId === record.id" @click="handleRestore(record)">
                Khôi phục
              </AButton>
              <APopconfirm
                title="Xóa vĩnh viễn tệp này khỏi R2/S3? Không thể hoàn tác!"
                ok-text="Xóa vĩnh viễn"
                cancel-text="Hủy"
                @confirm="handlePermanentDelete(record)"
              >
                <AButton size="small" danger :loading="rowActionId === record.id">Xóa hẳn</AButton>
              </APopconfirm>
            </ASpace>
          </template>
        </template>
      </ATable>
    </ClientOnly>

    <!-- Modal Upload tệp (POST /v1/platform/organizations/{org_id}/media/upload) -->
    <AModal
      v-model:open="uploadModalOpen"
      title="Tải tệp lên Media của Tổ chức"
      :confirm-loading="uploading"
      ok-text="Tải lên"
      cancel-text="Đóng"
      @ok="submitUpload"
    >
      <AForm layout="vertical" class="mt-3">
        <AFormItem label="Chọn tệp (tối đa 25 MB)" required>
          <input
            ref="fileInputRef"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx"
            class="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            @change="onFileSelected"
          />
          <div class="mt-1 text-[11px] text-slate-500">
            Hỗ trợ ảnh (JPEG, PNG, WEBP, GIF) hoặc tài liệu (PDF, DOC, DOCX, XLS, XLSX).
          </div>
          <div v-if="uploadForm.file" class="mt-1.5 text-xs font-medium text-emerald-700">
            Đã chọn: {{ uploadForm.file.name }} ({{ formatBytes(uploadForm.file.size) }})
          </div>
        </AFormItem>

        <AFormItem label="Thư mục con (folder)">
          <AInput v-model:value="uploadForm.folder" placeholder="logos, avatars, students, documents" />
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <ATag
              v-for="preset in folderPresets"
              :key="preset"
              class="cursor-pointer !text-[11px]"
              @click="uploadForm.folder = preset"
            >
              {{ preset }}
            </ATag>
          </div>
        </AFormItem>

        <AFormItem v-if="orgId" label="School ID (tùy chọn, nếu tách theo trường)">
          <AInput v-model:value="uploadForm.school_id" placeholder="UUID trường học" class="font-mono" />
        </AFormItem>

        <div v-if="lastUploadedUrl" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div class="font-semibold text-emerald-800">Đã tải lên thành công — access_url:</div>
          <div class="mt-1 flex items-center justify-between gap-2">
            <span class="truncate font-mono text-emerald-900">{{ lastUploadedUrl }}</span>
            <AButton size="small" @click="copyUrl(lastUploadedUrl)">Sao chép</AButton>
          </div>
        </div>
      </AForm>
    </AModal>

    <!-- Modal hiển thị URL truy cập (GET /v1/platform/organizations/{org_id}/media/{file_id}/url) -->
    <AModal v-model:open="urlModalOpen" title="Đường dẫn truy cập tệp" :footer="null">
      <div v-if="selectedFileUrl" class="space-y-3 pt-2 text-xs">
        <div>
          <div class="mb-1 font-medium text-slate-600">Object Key</div>
          <div class="rounded bg-slate-100 px-2.5 py-1.5 font-mono text-slate-800">
            {{ selectedFileUrl.object_key || "—" }}
          </div>
        </div>
        <div>
          <div class="mb-1 font-medium text-slate-600">
            Access URL
            <span v-if="selectedFileUrl.expires_in_seconds" class="text-slate-400">
              (hết hạn sau {{ selectedFileUrl.expires_in_seconds }}s)
            </span>
          </div>
          <div class="flex items-center gap-2 rounded bg-slate-100 px-2.5 py-1.5">
            <a
              v-if="selectedFileUrl.url"
              :href="selectedFileUrl.url"
              target="_blank"
              rel="noopener noreferrer"
              class="min-w-0 flex-1 truncate font-mono text-blue-600 hover:underline"
            >
              {{ selectedFileUrl.url }}
            </a>
            <AButton v-if="selectedFileUrl.url" size="small" @click="copyUrl(selectedFileUrl.url)">
              Sao chép
            </AButton>
          </div>
        </div>
      </div>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { TableProps } from "antdv-next";
import { useMediaApi } from "~/composables/api/useMediaApi";
import type { MediaFileURLOutput, StorageUsageOutput, StoredFile } from "~/types/api/media";

const props = defineProps<{
  orgId?: string;
}>();

const mediaApi = useMediaApi();
const { extractApiData, handleApiError } = useApiError();

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const folderPresets = computed(() =>
  props.orgId ? ["logos", "avatars", "documents", "students"] : ["avatars", "branding", "docs", "general"],
);

const viewMode = ref<"active" | "trash">("active");
const folderFilter = ref("");
const loading = ref(false);
const uploading = ref(false);
const rowActionId = ref<string | null>(null);

const usage = ref<StorageUsageOutput | null>(null);
const files = ref<StoredFile[]>([]);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const uploadModalOpen = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const lastUploadedUrl = ref("");
const uploadForm = reactive<{
  file: File | null;
  folder: string;
  school_id: string;
}>({
  file: null,
  folder: "",
  school_id: "",
});

const urlModalOpen = ref(false);
const selectedFileUrl = ref<MediaFileURLOutput | null>(null);

const columns: TableProps["columns"] = [
  { title: "Tệp", key: "file", width: 280 },
  { title: "Access URL", key: "access_url", width: 280 },
  { title: "Kích thước", key: "size", width: 110 },
  { title: "Thời gian", key: "time", width: 165 },
  { title: "Thao tác", key: "actions", fixed: "right", width: 185 },
];

const loadUsage = async () => {
  if (!props.orgId) {
    usage.value = null;
    return;
  }
  const { data, error } = await mediaApi.getOrgStorageUsage(props.orgId);
  if (handleApiError(data, error, "Không thể tải thông tin dung lượng lưu trữ!")) return;
  usage.value = (extractApiData(data) as StorageUsageOutput) ?? null;
};

const loadList = async () => {
  loading.value = true;
  try {
    const query = { page: pagination.page, limit: pagination.limit };
    const { data, error } =
      viewMode.value === "active"
        ? await mediaApi.listMedia(
            {
              ...query,
              folder: folderFilter.value.trim() || undefined,
            },
            props.orgId || undefined,
          )
        : await mediaApi.listMediaTrash(query, props.orgId || undefined);

    if (handleApiError(data, error, "Không thể tải danh sách tệp media!")) return;

    const list = extractApiData(data);
    files.value = Array.isArray(list) ? (list as StoredFile[]) : [];
    const meta = (data.value as { meta?: { total?: number } } | null)?.meta;
    pagination.total = meta?.total ?? files.value.length;
  } finally {
    loading.value = false;
  }
};

const loadAll = async () => {
  await Promise.all([loadUsage(), loadList()]);
};

watch(
  () => props.orgId,
  () => {
    pagination.page = 1;
    loadAll();
  },
  { immediate: true },
);

const onViewModeChange = () => {
  pagination.page = 1;
  loadList();
};

const handleFolderFilter = () => {
  pagination.page = 1;
  loadList();
};

const handleTableChange: TableProps["onChange"] = (pag) => {
  pagination.page = pag.current || 1;
  pagination.limit = pag.pageSize || 20;
  loadList();
};

const openUploadModal = () => {
  uploadForm.file = null;
  uploadForm.folder = folderFilter.value.trim();
  uploadForm.school_id = "";
  lastUploadedUrl.value = "";
  if (fileInputRef.value) fileInputRef.value.value = "";
  uploadModalOpen.value = true;
};

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  if (!file) {
    uploadForm.file = null;
    return;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    message.error("Kích thước tệp vượt quá giới hạn tối đa 25 MB!");
    input.value = "";
    uploadForm.file = null;
    return;
  }
  uploadForm.file = file;
};

const submitUpload = async () => {
  if (!uploadForm.file) {
    message.warning("Vui lòng chọn tệp để tải lên!");
    return;
  }

  uploading.value = true;
  try {
    const uploadInput = {
      file: uploadForm.file,
      folder: uploadForm.folder,
      ...(props.orgId ? { school_id: uploadForm.school_id } : {}),
    };
    const { accessUrl, data, error } = props.orgId
      ? await mediaApi.uploadAndGetUrl(props.orgId, uploadInput)
      : await mediaApi.uploadAndGetUrl(uploadInput);
    if (handleApiError(data, error, "Tải tệp lên thất bại!")) return;

    lastUploadedUrl.value = accessUrl;
    message.success("Tải tệp lên thành công!");
    uploadForm.file = null;
    if (fileInputRef.value) fileInputRef.value.value = "";
    await loadAll();
  } finally {
    uploading.value = false;
  }
};

const handleFetchAccessUrl = async (record: StoredFile) => {
  if (!record.id) return;
  rowActionId.value = record.id;
  try {
    const { data, error } = await mediaApi.getMediaUrl(record.id, props.orgId || undefined);
    if (handleApiError(data, error, "Không thể lấy đường dẫn truy cập tệp!")) return;
    selectedFileUrl.value = (extractApiData(data) as MediaFileURLOutput) ?? null;
    urlModalOpen.value = true;
  } finally {
    rowActionId.value = null;
  }
};

const handleSoftDelete = async (record: StoredFile) => {
  if (!record.access_url) {
    message.warning("Tệp không có access_url để xóa!");
    return;
  }
  rowActionId.value = record.id || null;
  try {
    const { data, error } = await mediaApi.deleteMediaByUrl(record.access_url, props.orgId || undefined);
    if (handleApiError(data, error, "Xóa tệp thất bại!")) return;
    message.success("Đã chuyển tệp vào thùng rác!");
    await loadAll();
  } finally {
    rowActionId.value = null;
  }
};

const handleRestore = async (record: StoredFile) => {
  if (!record.id) return;
  rowActionId.value = record.id;
  try {
    const { data, error } = await mediaApi.restoreMedia(record.id, props.orgId || undefined);
    if (handleApiError(data, error, "Khôi phục tệp thất bại!")) return;
    message.success("Đã khôi phục tệp!");
    await loadAll();
  } finally {
    rowActionId.value = null;
  }
};

const handlePermanentDelete = async (record: StoredFile) => {
  if (!record.id) return;
  rowActionId.value = record.id;
  try {
    const { data, error } = await mediaApi.permanentDeleteMedia(record.id, props.orgId || undefined);
    if (handleApiError(data, error, "Xóa vĩnh viễn tệp thất bại!")) return;
    message.success("Đã xóa vĩnh viễn tệp khỏi R2/S3!");
    await loadAll();
  } finally {
    rowActionId.value = null;
  }
};

const copyUrl = async (url?: string) => {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    message.success("Đã sao chép access_url!");
  } catch {
    message.warning("Không thể tự động sao chép, vui lòng copy thủ công.");
  }
};

const isImageMime = (mime?: string) => Boolean(mime && mime.startsWith("image/"));

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** idx;
  return `${idx === 0 ? value : value.toFixed(2)} ${units[idx]}`;
};

const formatDateTime = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("vi-VN");
};
</script>
