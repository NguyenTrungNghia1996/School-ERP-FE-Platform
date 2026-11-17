<template>
  <div class="flex min-h-[70vh] items-center justify-center p-4">
    <AResult
      status="403"
      title="403 - Không có quyền truy cập"
      :sub-title="subTitle"
    >
      <template #extra>
        <AButton type="primary" @click="navigateTo('/')">
          Về trang chủ
        </AButton>
      </template>
    </AResult>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const targetPath = computed(() => (route.query.path ? String(route.query.path) : ""));
const subTitle = computed(() =>
  targetPath.value
    ? `Bạn không có quyền truy cập vào đường dẫn: ${targetPath.value}`
    : "Bạn không có quyền truy cập vào trang này.",
);
</script>
