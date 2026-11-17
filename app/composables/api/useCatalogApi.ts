import type { UpdateFeatureInput, UpdatePermissionInput } from "~/types/api/catalog";

/**
 * Composable gọi các sub-endpoint có path param của Platform Catalog
 */
export const useCatalogApi = () => {
  const { fetchClient } = useRequest();

  return {
    updateFeature: (id: string, body: UpdateFeatureInput) =>
      fetchClient(`/v1/platform/catalog/features/${id}`, { method: "PUT", body }),

    updatePermission: (id: string, body: UpdatePermissionInput) =>
      fetchClient(`/v1/platform/catalog/permissions/${id}`, { method: "PUT", body }),
  };
};
