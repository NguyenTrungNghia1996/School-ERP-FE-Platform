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

/** Vai trò nền tảng kèm thống kê số nhân sự & danh sách quyền (iam.RoleWithSummary) */
export interface RoleWithSummary {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
  permissions?: PlatformPermission[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Request query cho GET /v1/platform/users */
export interface UserFilterParams {
  search?: string;
  status?: string;
  role_id?: string;
  page?: number;
  limit?: number;
}

/** Request body cho POST /v1/platform/users (iam.CreateUserInput) */
export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  role_ids?: string[];
}

/** Request body cho POST /v1/platform/roles (iam.CreateRoleInput) */
export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
}

/** Request body cho PATCH /v1/platform/users/{id}/status (Body3) */
export type UpdateUserStatusInput = {
  status: string;
};

/** Request body cho PUT /v1/platform/users/{id}/roles */
export type UpdateUserRolesInput = {
  role_ids: string[];
};

/** Request body cho PATCH /v1/platform/users/{id}/password */
export type ResetUserPasswordInput = Record<string, string | boolean>;

/** Request body cho PUT /v1/platform/roles/{id}/permissions */
export type UpdateRolePermissionsInput = Record<string, string[]>;
