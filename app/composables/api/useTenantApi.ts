import type { UpdateOrganizationInput } from "~/types/api/tenant";

/**
 * Composable gọi các sub-endpoint của Organization & Subdomain/DNS
 */
export const useTenantApi = () => {
  const { fetchClient } = useRequest();

  return {
    getOrganization: (id: string) => fetchClient(`/v1/platform/organizations/${id}`, { method: "GET" }),

    updateOrganization: (id: string, body: UpdateOrganizationInput) =>
      fetchClient(`/v1/platform/organizations/${id}`, { method: "PATCH", body }),

    approveOrganization: (id: string) =>
      fetchClient(`/v1/platform/organizations/${id}/approve`, { method: "POST" }),

    updateOrganizationStatus: (id: string, body: { status: string; reason?: string }) =>
      fetchClient(`/v1/platform/organizations/${id}/status`, { method: "PATCH", body }),

    changeOrganizationSubdomain: (id: string, body: Record<string, unknown>) =>
      fetchClient(`/v1/platform/organizations/${id}/change-subdomain`, { method: "POST", body }),

    retryOrganizationDns: (id: string) =>
      fetchClient(`/v1/platform/organizations/${id}/dns/retry`, { method: "POST" }),

    deleteSubdomainHistoryDns: (historyId: string) =>
      fetchClient(`/v1/platform/subdomain-histories/${historyId}/dns`, { method: "DELETE" }),
  };
};
