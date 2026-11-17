<template>
  <div class="border-b border-slate-200/80 bg-white px-4 py-2.5">
    <ClientOnly>
      <ABreadcrumb :items="breadcrumbItems" class="flex items-center text-xs" />
      <template #fallback>
        <div class="flex h-5 items-center text-xs text-slate-500">Trang chủ</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { BreadcrumbProps } from "antdv-next";

const route = useRoute();
const { visibleMenu, resolveIconName } = useMenu();
const NuxtIcon = resolveComponent("Icon");

const breadcrumbItems = computed<NonNullable<BreadcrumbProps["items"]>>(() => {
  const matched = findMenuPath(visibleMenu.value, route.path);
  const trail = matched.map((node, idx) => {
    const isLast = idx === matched.length - 1;
    const labelText = node.label || "";
    const titleNode = node.icon
      ? () =>
          h("span", { class: "inline-flex items-center gap-1" }, [
            h(NuxtIcon, { name: resolveIconName(node.icon), class: "text-xs" }),
            h("span", labelText),
          ])
      : labelText;

    return {
      title: titleNode,
      key: node.path || node.key || idx,
      ...(!isLast && node.path
        ? {
            class: "cursor-pointer text-slate-500 hover:text-blue-600",
            onClick: () => navigateTo(node.path!),
          }
        : {
            class: "font-medium text-slate-800",
          }),
    };
  });

  const isDashboard = route.path === "/dashboard";
  return [
    {
      key: "home",
      title: () =>
        h("span", { class: "inline-flex items-center gap-1" }, [
          h(NuxtIcon, { name: "ant-design:home-outlined", class: "text-xs" }),
          h("span", "Trang chủ"),
        ]),
      class: isDashboard ? "font-medium text-slate-800" : "cursor-pointer text-slate-500 hover:text-blue-600",
      ...(!isDashboard ? { onClick: () => navigateTo("/dashboard") } : {}),
    },
    ...trail,
  ];
});

const pageTitle = computed(() => {
  const matched = findMenuPath(visibleMenu.value, route.path);
  const lastLabel = matched[matched.length - 1]?.label;
  return lastLabel ? `${lastLabel} | School ERP` : "School ERP Platform";
});

useHead({
  title: pageTitle,
});
</script>
