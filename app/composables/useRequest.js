export const isTokenValid = (token) => {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = import.meta.server
      ? Buffer.from(base64, "base64").toString("utf8")
      : atob(base64);
    const payload = JSON.parse(json);
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

/**
 * Quản lý đồng bộ access_token & refresh_token giữa useState (cùng tick) và useCookie (SSR + browser)
 */
export const useAuthTokens = () => {
  const tokenCookie = useCookie("token", { sameSite: "lax" });
  const accessTokenCookie = useCookie("access_token", { maxAge: 60 * 60 * 24, sameSite: "lax" });
  const refreshTokenCookie = useCookie("refresh_token", { maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });

  const accessTokenState = useState("auth_access_token", () => accessTokenCookie.value || tokenCookie.value || null);
  const refreshTokenState = useState("auth_refresh_token", () => refreshTokenCookie.value || null);

  // Đồng bộ từ cookie nếu state đang trống mà cookie có sẵn (SSR / reload)
  if (!accessTokenState.value && (accessTokenCookie.value || tokenCookie.value)) {
    accessTokenState.value = accessTokenCookie.value || tokenCookie.value;
  }
  if (!refreshTokenState.value && refreshTokenCookie.value) {
    refreshTokenState.value = refreshTokenCookie.value;
  }

  const getAccessToken = () => accessTokenState.value || accessTokenCookie.value || tokenCookie.value || null;
  const getRefreshToken = () => refreshTokenState.value || refreshTokenCookie.value || null;

  const setTokens = (loginData) => {
    if (loginData?.access_token) {
      accessTokenState.value = loginData.access_token;
      accessTokenCookie.value = loginData.access_token;
    }
    if (loginData?.refresh_token) {
      refreshTokenState.value = loginData.refresh_token;
      refreshTokenCookie.value = loginData.refresh_token;
    }
  };

  const clearTokens = () => {
    accessTokenState.value = null;
    refreshTokenState.value = null;
    tokenCookie.value = null;
    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
  };

  return {
    accessTokenState,
    refreshTokenState,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
  };
};

let refreshPromise = null;

export const performTokenRefresh = async (baseURL, tokenStore) => {
  if (refreshPromise) return refreshPromise;

  const tokens = tokenStore ?? useAuthTokens();

  refreshPromise = (async () => {
    const rt = tokens.getRefreshToken();
    if (!rt || !isTokenValid(rt)) return false;

    try {
      const res = await $fetch("/v1/platform/auth/refresh", {
        baseURL,
        method: "POST",
        body: { refresh_token: rt },
      });

      const loginData = res && typeof res === "object" && "data" in res ? res.data : res;
      if (!loginData?.access_token) return false;

      tokens.setTokens(loginData);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const AUTH_SKIP_REFRESH_PATHS = ["/v1/platform/auth/login", "/v1/platform/auth/refresh"];

export const useRequest = () => {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase || "";

  // Capture đồng bộ trước mọi await để tránh lỗi NUXT_E1001
  const tokens = useAuthTokens();

  const getHeaders = (customHeaders = {}) => {
    const token = tokens.getAccessToken();
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
   * Chủ động refresh nếu access_token hết hạn, và retry 1 lần khi gặp 401.
   * @param {string} url
   * @param {Record<string, any>} [options]
   * @returns {Promise<{ data: import("vue").Ref<Record<string, any> | null>, error: import("vue").Ref<any> }>}
   */
  const fetchClient = async (url, options = {}) => {
    const { headers, ...rest } = options;
    /** @type {import("vue").Ref<Record<string, any> | null>} */
    const data = ref(null);
    /** @type {import("vue").Ref<any>} */
    const error = ref(null);
    const isAuthEndpoint = AUTH_SKIP_REFRESH_PATHS.some((p) => url.includes(p));

    // Chủ động làm mới nếu access_token đã hết hạn nhưng còn refresh_token hợp lệ
    const currentAccess = tokens.getAccessToken();
    if (!isAuthEndpoint && currentAccess && !isTokenValid(currentAccess) && isTokenValid(tokens.getRefreshToken())) {
      await performTokenRefresh(baseURL, tokens);
    }

    try {
      data.value = await $fetch(url, {
        baseURL,
        headers: getHeaders(headers),
        ...rest,
      });
    } catch (err) {
      const status = err?.statusCode || err?.response?.status;
      const shouldRefresh = status === 401 && !isAuthEndpoint;

      if (shouldRefresh && (await performTokenRefresh(baseURL, tokens))) {
        try {
          data.value = await $fetch(url, {
            baseURL,
            headers: getHeaders(headers),
            ...rest,
          });
          return { data, error };
        } catch (retryErr) {
          error.value = retryErr;
          return { data, error };
        }
      }

      if (shouldRefresh) {
        tokens.clearTokens();
        if (import.meta.client) {
          navigateTo("/login");
        }
      }

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
