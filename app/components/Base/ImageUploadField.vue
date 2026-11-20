<template>
  <div class="flex flex-wrap items-center gap-4">
    <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100" :class="round ? 'rounded-full' : 'rounded-xl'">
      <img v-if="previewUrl" :src="previewUrl" alt="preview" class="h-full w-full object-cover" />
      <Icon v-else :name="round ? 'ant-design:user-outlined' : 'ant-design:picture-outlined'" class="text-2xl text-slate-400" />
    </div>

    <div class="flex-1 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <ClientOnly>
          <AUpload accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" :show-upload-list="false" :max-count="1" :before-upload="handleBeforeUpload">
            <AButton size="small">
              <template #icon><Icon name="ant-design:upload-outlined" /></template>
              {{ previewUrl ? "Thay ảnh khác" : "Chọn ảnh" }}
            </AButton>
          </AUpload>
        </ClientOnly>
        <AButton v-if="previewUrl" size="small" danger @click="clearImage">
          <template #icon><Icon name="ant-design:delete-outlined" /></template>
          Xóa ảnh
        </AButton>
      </div>
      <div class="text-[11px] text-slate-500">
        <span v-if="file">Đã chọn: {{ file.name }} (sẽ tải lên khi lưu)</span>
        <span v-else>Hỗ trợ JPEG, PNG, WEBP, GIF (tối đa 25 MB)</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { UploadProps } from "antdv-next";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const props = defineProps<{
  modelValue?: string;
  file?: File | null;
  round?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [val: string];
  "update:file": [file: File | null];
}>();

const localObjectUrl = ref("");

const revokeLocalUrl = () => {
  if (localObjectUrl.value) {
    URL.revokeObjectURL(localObjectUrl.value);
    localObjectUrl.value = "";
  }
};

watch(
  () => props.file,
  (newFile) => {
    revokeLocalUrl();
    if (newFile && import.meta.client) {
      localObjectUrl.value = URL.createObjectURL(newFile);
    }
  },
  { immediate: true },
);

onBeforeUnmount(revokeLocalUrl);

const previewUrl = computed(() => localObjectUrl.value || props.modelValue || "");

const handleBeforeUpload: UploadProps["beforeUpload"] = (picked) => {
  if (!ALLOWED_TYPES.has(picked.type)) {
    message.error("Chỉ hỗ trợ ảnh định dạng JPEG, PNG, WEBP hoặc GIF!");
    return false;
  }
  if ((picked.size || 0) > MAX_BYTES) {
    message.error("Kích thước ảnh vượt quá giới hạn tối đa 25 MB!");
    return false;
  }
  emit("update:file", picked);
  return false;
};

const clearImage = () => {
  revokeLocalUrl();
  emit("update:file", null);
  emit("update:modelValue", "");
};
</script>
