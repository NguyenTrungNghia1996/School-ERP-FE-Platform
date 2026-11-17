export const useRequest = () => {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase || "";

  const getHeaders = (customHeaders = {}) => {
    const token = useCookie("token").value || useCookie("access_token").value;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    };
  };

  /**
   * Top-level SSR / useFetch request
   */
  const fetchSSR = (url, options = {}) => {
    const { headers, ...rest } = options;
    return useFetch(url, {
      baseURL,
      headers: getHeaders(headers),
      ...rest,
    });
  };

  /**
   * Client / event-driven $fetch request returning { data, error } refs
   */
  const fetchClient = async (url, options = {}) => {
    const { headers, ...rest } = options;
    const data = ref(null);
    const error = ref(null);

    try {
      data.value = await $fetch(url, {
        baseURL,
        headers: getHeaders(headers),
        ...rest,
      });
    } catch (err) {
      error.value = err;
    }

    return { data, error };
  };

  return {
    baseURL,
    getHeaders,
    fetchSSR,
    fetchClient,
  };
};

export const useCrudApi = (endpointPath) => {
  const { fetchSSR, fetchClient } = useRequest();

  return {
    get: (options = {}) => fetchSSR(endpointPath, { method: "GET", ...options }),
    getClient: (options = {}) => fetchClient(endpointPath, { method: "GET", ...options }),
    post: (body, options = {}) => fetchClient(endpointPath, { method: "POST", body, ...options }),
    put: (body, options = {}) => fetchClient(endpointPath, { method: "PUT", body, ...options }),
    patch: (body, options = {}) => fetchClient(endpointPath, { method: "PATCH", body, ...options }),
    delete: (options = {}) => fetchClient(endpointPath, { method: "DELETE", ...options }),
  };
};
