import { useCrudApi } from "~/composables/useRequest";

export const useApi = () => {
  return {
    health: useCrudApi("/api/health"),
  };
};
