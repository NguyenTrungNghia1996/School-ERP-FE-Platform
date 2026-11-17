<template>
  <div class="mx-auto max-w-3xl p-6 space-y-6">
    <a-card title="Kiểm tra trạng thái hệ thống (GET /api/health)">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <span class="font-medium">Trạng thái SSR (useFetch):</span>
          <a-tag v-if="loading" color="processing">Đang kiểm tra...</a-tag>
          <a-tag v-else-if="healthError" color="error">Lỗi kết nối</a-tag>
          <a-tag v-else color="success">
            {{ healthData?.status || "ok" }}
          </a-tag>
        </div>

        <div v-if="healthResponse" class="rounded bg-slate-100 p-3 text-sm">
          <pre class="m-0 overflow-auto">{{ healthResponse }}</pre>
        </div>

        <a-space>
          <a-button :loading="loading" @click="() => checkHealth()">
            Làm mới SSR (refresh)
          </a-button>
          <a-button type="primary" :loading="isChecking" @click="handleCheckHealth">
            Kiểm tra trạng thái (Health Check)
          </a-button>
        </a-space>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { message } from "antdv-next";
import { useApi } from "~/composables/useApi";
import { useApiError } from "~/composables/useApiError";

const { health: healthApi } = useApi();
const { handleApiError, extractApiData } = useApiError();

// Cách 1: Gọi tải dữ liệu khi trang khởi tạo (Top-level SSR / useFetch)
const {
  data: healthResponse,
  pending: loading,
  refresh: checkHealth,
  error: healthError,
} = await healthApi.get({
  key: "system-health-check",
});

const healthData = computed(() => extractApiData(healthResponse));

watch(
  () => unref(healthError),
  (err) => {
    if (err) {
      handleApiError(null, err, "Không thể kết nối đến máy chủ!");
    }
  },
);

// Cách 2: Gọi theo hành động người dùng (Click Button / Client Event)
const isChecking = ref(false);

const handleCheckHealth = async () => {
  isChecking.value = true;
  try {
    const { data: resData, error: apiErr } = await healthApi.getClient();

    if (handleApiError(resData, apiErr, "Kiểm tra hệ thống thất bại!")) {
      return;
    }

    const payload = extractApiData(resData);
    message.success(unref(resData)?.message || payload?.message || "Hệ thống hoạt động bình thường!");
  } catch (err) {
    console.error("Lỗi kiểm tra health:", err);
    message.error("Đã xảy ra lỗi mạng!");
  } finally {
    isChecking.value = false;
  }
};
</script>
