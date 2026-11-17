<template>
  <aside class="flex h-full flex-col">
    <ClientOnly>
      <ALayout class="h-full bg-white">
        <ALayoutSider
          v-model:collapsed="collapsed"
          theme="light"
          width="250"
          collapsed-width="50"
          breakpoint="md"
          collapsible
          class="h-full overflow-y-auto !border-r !border-slate-200/80"
        >
          <!-- Ô tìm kiếm menu nhanh -->
          <div class="p-2">
            <AInput
              v-if="!collapsed"
              v-model:value="searchQuery"
              placeholder="Tìm kiếm menu..."
              allow-clear
            >
              <template #prefix>
                <Icon name="ant-design:search-outlined" class="text-slate-400" />
              </template>
            </AInput>
            <div v-else class="flex cursor-pointer justify-center py-1" @click="collapsed = false">
              <Icon name="ant-design:search-outlined" class="text-lg text-slate-500" />
            </div>
          </div>

          <!-- Danh sách Menu phân cấp từ GET /v1/platform/me (AntDMenuNode[]) -->
          <AMenu
            v-model:openKeys="openKeys"
            v-model:selectedKeys="selectedKeys"
            theme="light"
            mode="inline"
            :items="antdMenuItems"
            @click="handleMenuClick"
          />
        </ALayoutSider>
      </ALayout>
    </ClientOnly>
  </aside>
</template>

<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { MenuProps } from "antdv-next";
import type { AntDMenuNode } from "~/types/api/auth";

const route = useRoute();
const collapsed = ref(false);
const searchQuery = ref("");
const selectedKeys = ref<string[]>([route.path]);
const openKeys = ref<string[]>([]);

const { visibleMenu, searchMenu, resolveIconName } = useMenu();
const NuxtIcon = resolveComponent("Icon");

const toAntdMenuItems = (nodes: AntDMenuNode[]): NonNullable<MenuProps["items"]> =>
  nodes.map((node, index) => {
    const itemKey = node.path || node.key || node.id || `menu-${index}`;
    const hasChildren = Boolean(node.children?.length);
    const iconName = resolveIconName(
      node.icon,
      hasChildren ? "ant-design:folder-outlined" : "ant-design:appstore-outlined",
    );

    return {
      key: itemKey,
      label: node.label || "",
      icon: () => h(NuxtIcon, { name: iconName, class: "text-base" }),
      ...(hasChildren ? { children: toAntdMenuItems(node.children!) } : {}),
    };
  });

const antdMenuItems = computed(() => {
  const filtered = searchMenu(searchQuery.value);
  return toAntdMenuItems(filtered);
});

watch(
  () => [route.path, visibleMenu.value] as const,
  ([path, nodes]) => {
    selectedKeys.value = [path];
    const matched = findMenuPath(nodes, path);
    if (matched.length > 1) {
      openKeys.value = matched
        .slice(0, -1)
        .map((n) => n.path || n.key || n.id || "")
        .filter(Boolean);
    }
  },
  { immediate: true },
);

const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
  const target = String(key);
  if (target.startsWith("/")) {
    navigateTo(target);
  }
};
</script>
