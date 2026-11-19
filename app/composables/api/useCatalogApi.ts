import type {
  CreateRouteInput,
  UpdateFeatureInput,
  UpdateMenuInput,
  UpdatePermissionInput,
  UpdateRouteInput,
} from "~/types/api/catalog";

/**
 * Composable gọi các endpoint CRUD của Platform Catalog (Features, Permissions, Menus, Routes)
 */
export const useCatalogApi = () => {
  const { fetchClient } = useRequest();

  return {
    updateFeature: (id: string, body: UpdateFeatureInput) =>
      fetchClient(`/v1/platform/catalog/features/${id}`, { method: "PUT", body }),

    deleteFeature: (id: string) =>
      fetchClient(`/v1/platform/catalog/features/${id}`, { method: "DELETE" }),

    updatePermission: (id: string, body: UpdatePermissionInput) =>
      fetchClient(`/v1/platform/catalog/permissions/${id}`, { method: "PUT", body }),

    deletePermission: (id: string) =>
      fetchClient(`/v1/platform/catalog/permissions/${id}`, { method: "DELETE" }),

    updateMenu: (id: string, body: UpdateMenuInput) =>
      fetchClient(`/v1/platform/catalog/menus/${id}`, { method: "PATCH", body }),

    deleteMenu: (id: string) =>
      fetchClient(`/v1/platform/catalog/menus/${id}`, { method: "DELETE" }),

    createRoute: (body: CreateRouteInput) =>
      fetchClient(`/v1/platform/catalog/routes`, { method: "POST", body }),

    updateRoute: (id: string, body: UpdateRouteInput) =>
      fetchClient(`/v1/platform/catalog/routes/${id}`, { method: "PUT", body }),

    deleteRoute: (id: string) =>
      fetchClient(`/v1/platform/catalog/routes/${id}`, { method: "DELETE" }),
  };
};
