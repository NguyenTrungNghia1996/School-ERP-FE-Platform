import { useCrudApi } from "~/composables/useRequest";

export const useApi = () => {
  return {
    health: useCrudApi("/health"),

    // Platform Auth & Profile (apidog-erp)
    platformAuthLogin: useCrudApi("/v1/platform/auth/login"),
    platformAuthRefresh: useCrudApi("/v1/platform/auth/refresh"),
    platformAuthLogout: useCrudApi("/v1/platform/auth/logout"),
    platformMe: useCrudApi("/v1/platform/me"),
    platformMeChangePassword: useCrudApi("/v1/platform/me/change-password"),
    platformMePassword: useCrudApi("/v1/platform/me/password"),
    platformMeMfaSetup: useCrudApi("/v1/platform/me/mfa/setup"),
    platformMeMfaEnable: useCrudApi("/v1/platform/me/mfa/enable"),
    platformMeMfaDisable: useCrudApi("/v1/platform/me/mfa/disable"),

    // Platform IAM & Menus (apidog-erp)
    platformMenusTree: useCrudApi("/v1/platform/menus/tree"),
    platformUsers: useCrudApi("/v1/platform/users"),
    platformRoles: useCrudApi("/v1/platform/roles"),
    platformPermissions: useCrudApi("/v1/platform/permissions"),
    platformIamUsers: useCrudApi("/v1/platform/iam/users"),
    platformIamRoles: useCrudApi("/v1/platform/iam/roles"),
    platformIamPermissions: useCrudApi("/v1/platform/iam/permissions"),

    // Platform Catalog - Menus, Features, Routes, Permissions (apidog-erp)
    catalogMenusTree: useCrudApi("/v1/platform/catalog/menus/tree"),
    catalogMenus: useCrudApi("/v1/platform/catalog/menus"),
    catalogMenusReorder: useCrudApi("/v1/platform/catalog/menus/reorder"),
    catalogFeatures: useCrudApi("/v1/platform/catalog/features"),
    catalogRoutes: useCrudApi("/v1/platform/catalog/routes"),
    catalogPermissions: useCrudApi("/v1/platform/catalog/permissions"),

    // Platform Organizations & Subdomains (apidog-erp)
    platformOrganizations: useCrudApi("/v1/platform/organizations"),
    platformOrganizationsCheckSubdomain: useCrudApi("/v1/platform/organizations/check-subdomain"),
    platformReservedSubdomains: useCrudApi("/v1/platform/reserved-subdomains"),
    platformReservedSubdomainsSyncCloudflare: useCrudApi("/v1/platform/reserved-subdomains/sync-cloudflare"),
    publicTenantResolve: useCrudApi("/v1/public/tenant-resolve"),

    // Platform Billing & Packages (apidog-erp)
    platformPackages: useCrudApi("/v1/platform/packages"),

    // Platform Support & Audit Logs (apidog-erp)
    platformSupportSessions: useCrudApi("/v1/platform/support-sessions"),
    platformAuditLogs: useCrudApi("/v1/platform/audit-logs"),
  };
};
