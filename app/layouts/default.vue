<template>
  <div class="flex h-screen w-full flex-col overflow-hidden bg-gray-200 font-sans">
    <!-- Header cố định -->
    <div class="sticky top-0 z-20 h-14 flex-shrink-0">
      <BaseHeader />
    </div>

    <!-- Body gồm Menu và Content -->
    <div class="flex min-h-[calc(100vh-56px)] w-full flex-1 overflow-hidden">
      <!-- Sidebar Menu -->
      <BaseMenu />

      <!-- Content Area -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- Sticky Breadcrumb -->
        <div class="sticky top-0 z-10 bg-white">
          <BaseBreadcrumb />
        </div>

        <!-- Vùng cuộn độc lập cho nội dung trang -->
        <main class="flex-1 overflow-y-auto p-2 md:p-4">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchMe } = useAuth();

onMounted(() => {
  fetchMe();
});
</script>
