import type { PlatformRole, PlatformUser } from "./auth";

export type { PlatformRole, PlatformUser };

/** Quyền nền tảng (iam.PlatformPermission) */
export interface PlatformPermission {
  id?: string;
  code?: string;
  name?: string;
  module?: string;
  description?: string;
  created_at?: string;
}

/** Quyền nền tảng trong ma trận gom nhóm (iam.PermissionItem) */
export interface PermissionItem {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
}

/** Nhóm quyền nền tảng gom theo Module (iam.PermissionModuleGroup) */
export interface PermissionModuleGroup {
  module?: string;
  module_label?: string;
  permissions?: PermissionItem[];
}

/** Vai trò nền tảng kèm thống kê số nhân sự & danh sách quyền (iam.RoleWithSummary) */
export interface RoleWithSummary {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
  permission_count?: number;
  permissions?: PlatformPermission[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Thông tin tóm tắt nhân sự thuộc vai trò (iam.RoleUserSummary) */
export interface RoleUserSummary {
  id?: string;
  email?: string;
  full_name?: string;
  status?: string;
  created_at?: string;
}

/** Chi tiết vai trò nền tảng kèm danh sách quyền và nhân sự (iam.RoleDetailOutput) */
export interface RoleDetailOutput {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  is_system?: boolean;
  permission_ids?: string[];
  permissions?: PlatformPermission[];
  user_count?: number;
  users?: RoleUserSummary[];
  created_at?: string;
  updated_at?: string;
}

/** Request query cho GET /v1/platform/users & GET /v1/platform/iam/users */
export interface UserFilterParams {
  search?: string;
  status?: string;
  role_id?: string;
  page?: number;
  limit?: number;
}

/** Request body cho POST /v1/platform/users & POST /v1/platform/iam/users (iam.CreateUserInput) */
export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  avatar_url?: string;
  role_ids?: string[];
  must_change_password?: boolean;
}

/** Request body cho PATCH /v1/platform/iam/users/{id} (iam.UpdateUserInput) */
export interface UpdateUserInput {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  status?: string;
  reason?: string;
}

/** Request body cho POST /v1/platform/roles & POST /v1/platform/iam/roles (iam.CreateRoleInput) */
export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
  permission_ids?: string[];
}

/** Request body cho PUT /v1/platform/iam/roles/{id} (iam.UpdateRoleInput) */
export interface UpdateRoleInput {
  code?: string;
  name?: string;
  description?: string;
  permission_ids?: string[];
}

/** Request body cho PATCH /v1/platform/users/{id}/status (Body3) */
export type UpdateUserStatusInput = {
  status: string;
};

/** Request body cho PUT /v1/platform/users/{id}/roles & PUT /v1/platform/iam/users/{id}/roles */
export type UpdateUserRolesInput = {
  role_ids: string[];
};

/** Request body cho POST /v1/platform/iam/users/{id}/reset-password (iam.ResetUserPasswordInput) */
export interface IamResetUserPasswordInput {
  new_password?: string;
  must_change_password?: boolean;
  reason?: string;
}

/** Request body cho PATCH /v1/platform/users/{id}/password */
export type ResetUserPasswordInput = Record<string, string | boolean>;

/** Request body cho PUT /v1/platform/roles/{id}/permissions */
export type UpdateRolePermissionsInput = Record<string, string[]>;
