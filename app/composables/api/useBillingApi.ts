import type {
  CreateSubscriptionInput,
  CreateVersionInput,
  RenewSubscriptionInput,
  SwitchPrimaryInput,
  UpdateVersionInput,
} from "~/types/api/billing";

/**
 * Composable gọi các sub-endpoint của Packages, Package Versions, Subscriptions & Entitlements
 */
export const useBillingApi = () => {
  const { fetchClient } = useRequest();

  return {
    getPackage: (id: string) => fetchClient(`/v1/platform/packages/${id}`, { method: "GET" }),

    createPackageVersion: (packageId: string, body: CreateVersionInput) =>
      fetchClient(`/v1/platform/packages/${packageId}/versions`, { method: "POST", body }),

    updatePackageVersion: (versionId: string, body: UpdateVersionInput) =>
      fetchClient(`/v1/platform/package-versions/${versionId}`, { method: "PUT", body }),

    publishPackageVersion: (versionId: string) =>
      fetchClient(`/v1/platform/package-versions/${versionId}/publish`, { method: "POST" }),

    deprecatePackageVersion: (versionId: string) =>
      fetchClient(`/v1/platform/package-versions/${versionId}/deprecate`, { method: "POST" }),

    getOrgSubscriptions: (orgId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/subscriptions`, { method: "GET" }),

    createOrgSubscription: (orgId: string, body: CreateSubscriptionInput) =>
      fetchClient(`/v1/platform/organizations/${orgId}/subscriptions`, { method: "POST", body }),

    switchOrgPrimary: (orgId: string, body: SwitchPrimaryInput) =>
      fetchClient(`/v1/platform/organizations/${orgId}/switch-primary`, { method: "POST", body }),

    getOrgEntitlements: (orgId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/entitlements`, { method: "GET" }),

    renewSubscription: (subId: string, body: RenewSubscriptionInput) =>
      fetchClient(`/v1/platform/subscriptions/${subId}/renew`, { method: "POST", body }),

    suspendSubscription: (subId: string, body: Record<string, string> = {}) =>
      fetchClient(`/v1/platform/subscriptions/${subId}/suspend`, { method: "PATCH", body }),

    revokeSubscription: (subId: string, body: Record<string, string> = {}) =>
      fetchClient(`/v1/platform/subscriptions/${subId}/revoke`, { method: "PATCH", body }),
  };
};
