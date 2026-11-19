import type {
  IamResetUserPasswordInput,
  ResetUserPasswordInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
  UpdateUserInput,
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

    // --- /v1/platform/iam/* (spec mới) ---
    getIamRole: (id: string) =>
      fetchClient(`/v1/platform/iam/roles/${id}`, { method: "GET" }),

    updateIamRole: (id: string, body: UpdateRoleInput) =>
      fetchClient(`/v1/platform/iam/roles/${id}`, { method: "PUT", body }),

    deleteIamRole: (id: string) =>
      fetchClient(`/v1/platform/iam/roles/${id}`, { method: "DELETE" }),

    getIamUser: (id: string) =>
      fetchClient(`/v1/platform/iam/users/${id}`, { method: "GET" }),

    updateIamUser: (id: string, body: UpdateUserInput) =>
      fetchClient(`/v1/platform/iam/users/${id}`, { method: "PATCH", body }),

    deleteIamUser: (id: string, reason?: string) =>
      fetchClient(`/v1/platform/iam/users/${id}`, {
        method: "DELETE",
        query: reason ? { reason } : undefined,
      }),

    disableIamUserMfa: (id: string, body: { reason?: string } = {}) =>
      fetchClient(`/v1/platform/iam/users/${id}/mfa/disable`, { method: "PATCH", body }),

    resetIamUserPassword: (id: string, body: IamResetUserPasswordInput) =>
      fetchClient(`/v1/platform/iam/users/${id}/reset-password`, { method: "POST", body }),

    updateIamUserRoles: (id: string, body: UpdateUserRolesInput) =>
      fetchClient(`/v1/platform/iam/users/${id}/roles`, { method: "PUT", body }),
  };
};
