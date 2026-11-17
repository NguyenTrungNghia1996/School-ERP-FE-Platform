import type {
  ResetUserPasswordInput,
  UpdateRolePermissionsInput,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
} from "~/types/api/iam";

/**
 * Composable gọi các sub-endpoint có path param của Platform IAM (Users & Roles)
 */
export const usePlatformIamApi = () => {
  const { fetchClient } = useRequest();

  return {
    updateUserStatus: (id: string, body: UpdateUserStatusInput) =>
      fetchClient(`/v1/platform/users/${id}/status`, { method: "PATCH", body }),

    updateUserRoles: (id: string, body: UpdateUserRolesInput) =>
      fetchClient(`/v1/platform/users/${id}/roles`, { method: "PUT", body }),

    resetUserPassword: (id: string, body: ResetUserPasswordInput) =>
      fetchClient(`/v1/platform/users/${id}/password`, { method: "PATCH", body }),

    disableUserMfa: (id: string, body: Record<string, string> = {}) =>
      fetchClient(`/v1/platform/users/${id}/mfa/disable`, { method: "PATCH", body }),

    deleteUserMfa: (id: string, body: Record<string, string> = {}) =>
      fetchClient(`/v1/platform/users/${id}/mfa`, { method: "DELETE", body }),

    updateRolePermissions: (id: string, body: UpdateRolePermissionsInput) =>
      fetchClient(`/v1/platform/roles/${id}/permissions`, { method: "PUT", body }),
  };
};
