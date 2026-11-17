import type { AntDMenuNode } from "~/types/api/auth";

const findMenuNodeByPath = (nodes: AntDMenuNode[], targetPath: string): AntDMenuNode | null => {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children?.length) {
      const found = findMenuNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

export const usePermission = () => {
  const userStore = useUserStore();

  const permissions = computed(() => userStore.permissions);
  const menus = computed(() => userStore.menus);
  const isLoaded = computed(() => userStore.isLoaded);

  const hasPermission = (code: string) => permissions.value.includes(code);

  const hasAnyPermission = (codes: string[]) => codes.some((code) => hasPermission(code));

  const hasAllPermissions = (codes: string[]) => codes.every((code) => hasPermission(code));

  const resolveTargetPath = (targetPath: string) => {
    if (findMenuNodeByPath(menus.value, targetPath)) return targetPath;
    if (/^\/organizations\/[^/]+$/.test(targetPath)) return "/organizations";
    if (/^\/packages\/[^/]+$/.test(targetPath)) return "/packages";
    return targetPath;
  };

  const canAccess = (path?: string) => {
    const target = resolveTargetPath(path || useRoute().path);
    const node = findMenuNodeByPath(menus.value, target);
    if (!node) return false;
    if (!node.required_permission_code) return true;
    return hasPermission(node.required_permission_code);
  };

  return {
    permissions,
    menus,
    isLoaded,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    fetchMe: userStore.fetchMe,
  };
};
