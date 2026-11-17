/**
 * Composable gọi các sub-endpoint của Support Sessions (Four-Eyes mode)
 */
export const useSupportApi = () => {
  const { fetchClient } = useRequest();

  return {
    approveSession: (id: string) =>
      fetchClient(`/v1/platform/support-sessions/${id}/approve`, { method: "POST" }),

    exchangeSessionToken: (id: string) =>
      fetchClient(`/v1/platform/support-sessions/${id}/exchange-token`, { method: "POST" }),

    revokeSession: (id: string, body: Record<string, string> = {}) =>
      fetchClient(`/v1/platform/support-sessions/${id}/revoke`, { method: "POST", body }),
  };
};
