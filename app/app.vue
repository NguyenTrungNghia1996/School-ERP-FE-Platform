<template>
  <!-- <AApp>
    <NuxtPage />
  </AApp> -->
  <a-config-provider :render-empty="renderEmpty">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </a-config-provider>
</template>

<script setup lang="ts">
// Dùng plain DOM VNode cho Table empty state để tránh @v-c/table tái sử dụng component VNode khi ResizeObserver bật wrapper scroll ngang
const renderEmpty = (componentName?: string) => {
  if (componentName === "Table") {
    return h(
      "div",
      { class: "flex flex-col items-center justify-center py-8 text-center text-slate-400" },
      [h("div", { class: "text-sm" }, "Không có dữ liệu")],
    );
  }
  return undefined;
};
</script>
