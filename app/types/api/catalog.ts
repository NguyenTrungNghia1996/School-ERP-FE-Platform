/** Tính năng trong Feature Catalog (catalog.Feature) */
export interface CatalogFeature {
  id?: string;
  code?: string;
  name?: string;
  module?: string;
  description?: string;
  is_active?: boolean;
  is_core?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Route của Tenant (catalog.TenantRoute) */
export interface TenantRoute {
  id?: string;
  route_key?: string;
  name?: string;
  path?: string;
  feature_id?: string;
  is_active?: boolean;
  created_at?: string;
}

/** Quyền của Tenant trong Permission Catalog (catalog.TenantPermission) */
export interface TenantPermission {
  id?: string;
  code?: string;
  name?: string;
  resource?: string;
  action?: string;
  description?: string;
  feature_id?: string;
  feature?: CatalogFeature;
  is_active?: boolean;
  is_sensitive?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Node trên cây menu nền của Tenant trả về từ GET /v1/platform/catalog/menus/tree (catalog.TenantMenuTreeNode) */
export interface TenantMenuTreeNode {
  id?: string;
  key?: string;
  label?: string;
  type?: string;
  icon?: string;
  path?: string;
  parent_id?: string;
  feature_id?: string;
  feature_code?: string;
  route_id?: string;
  sort_order?: number;
  is_active?: boolean;
  is_mandatory?: boolean;
  permission_match_mode?: string;
  required_permissions?: string[];
  target_portals?: string[];
  children?: TenantMenuTreeNode[];
}

/** Thông tin chi tiết node menu vừa tạo (catalog.TenantBaseMenu) */
export interface TenantBaseMenu {
  id?: string;
  menu_key?: string;
  label?: string;
  menu_type?: string;
  icon?: string;
  parent_id?: string;
  feature_id?: string;
  feature?: CatalogFeature;
  route_id?: string;
  route?: TenantRoute;
  sort_order?: number;
  is_active?: boolean;
  is_mandatory?: boolean;
  permission_match_mode?: string;
  required_permissions?: string[];
  target_portals?: string[];
  created_at?: string;
  updated_at?: string;
}

/** Payload tạo mới node menu POST /v1/platform/catalog/menus (catalog.CreateMenuInput) */
export interface CreateMenuInput {
  label: string;
  menu_key: string;
  menu_type?: string;
  icon?: string;
  parent_id?: string;
  feature_id?: string;
  route_id?: string;
  sort_order?: number;
  is_active?: boolean;
  is_mandatory?: boolean;
  permission_match_mode?: string;
  required_permissions?: string[];
  target_portals?: string[];
}

/** Phần tử sắp xếp lại cây menu PUT /v1/platform/catalog/menus/reorder (catalog.ReorderMenuItem) */
export interface ReorderMenuItem {
  id: string;
  parent_id?: string;
  sort_order: number;
}

/** Query params cho GET /v1/platform/catalog/features */
export interface FeatureFilterParams {
  module?: string;
  is_active?: string;
  search?: string;
}

/** Payload tạo mới tính năng POST /v1/platform/catalog/features (catalog.CreateFeatureInput) */
export interface CreateFeatureInput {
  code?: string;
  name?: string;
  module?: string;
  description?: string;
  is_active?: boolean;
  is_core?: boolean;
}

/** Payload cập nhật tính năng PUT /v1/platform/catalog/features/{id} (catalog.UpdateFeatureInput) */
export type UpdateFeatureInput = CreateFeatureInput;

/** Query params cho GET /v1/platform/catalog/permissions */
export interface PermissionFilterParams {
  feature_id?: string;
  resource?: string;
  is_sensitive?: string;
}

/** Payload tạo mới quyền Tenant POST /v1/platform/catalog/permissions (catalog.CreatePermissionInput) */
export interface CreatePermissionInput {
  code?: string;
  name?: string;
  resource?: string;
  action?: string;
  feature_id?: string;
  description?: string;
  is_active?: boolean;
  is_sensitive?: boolean;
}

/** Payload cập nhật quyền Tenant PUT /v1/platform/catalog/permissions/{id} (catalog.UpdatePermissionInput) */
export interface UpdatePermissionInput {
  code?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  is_sensitive?: boolean;
}
