import type { AntDMenuNode } from "~/types/api/auth";

/**
 * Chuẩn hóa tên icon (VD: "UserOutlined", "user-outlined", "ant-design:user-outlined")
 * về định dạng của @nuxt/icon ("ant-design:...")
 */
export const resolveIconName = (icon?: string, fallback = "ant-design:appstore-outlined"): string => {
  if (!icon || !icon.trim()) return fallback;
  const raw = icon.trim();
  if (raw.includes(":")) return raw;

  // Chuyển PascalCase/camelCase (VD: UserSwitchOutlined -> user-switch-outlined)
  const kebab = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

  if (kebab.endsWith("-outlined") || kebab.endsWith("-filled") || kebab.endsWith("-twotone")) {
    return `ant-design:${kebab}`;
  }
  return `ant-design:${kebab}-outlined`;
};

const filterHiddenNodes = (nodes: AntDMenuNode[]): AntDMenuNode[] =>
  nodes
    .filter((node) => !node.hidden)
    .map((node) => ({
      ...node,
      children: node.children?.length ? filterHiddenNodes(node.children) : undefined,
    }));

const filterNodesByQuery = (nodes: AntDMenuNode[], query: string): AntDMenuNode[] => {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  return nodes.reduce<AntDMenuNode[]>((acc, node) => {
    const labelMatch = node.label?.toLowerCase().includes(q) ?? false;
    const filteredChildren = node.children?.length ? filterNodesByQuery(node.children, q) : [];
    if (labelMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }
    return acc;
  }, []);
};

/**
 * Truy vết đường dẫn menu (AntDMenuNode[]) khớp với route.path
 */
export const findMenuPath = (nodes: AntDMenuNode[], targetPath: string): AntDMenuNode[] => {
  for (const node of nodes) {
    if (node.path && node.path === targetPath) {
      return [node];
    }
    if (node.children?.length) {
      const childPath = findMenuPath(node.children, targetPath);
      if (childPath.length > 0) {
        return [node, ...childPath];
      }
    }
  }
  return [];
};

export const useMenu = () => {
  const { menus } = useAuth();

  const visibleMenu = computed<AntDMenuNode[]>(() => filterHiddenNodes(menus.value));

  const searchMenu = (query: string) => filterNodesByQuery(visibleMenu.value, query);

  return {
    visibleMenu,
    searchMenu,
    resolveIconName,
  };
};
