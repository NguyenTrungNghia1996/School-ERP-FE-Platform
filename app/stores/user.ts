import { defineStore } from "pinia";
import { isTokenValid, performTokenRefresh, useAuthTokens } from "~/composables/useRequest";
import type { AntDMenuNode, LoginInput, LoginOutput, MeProfile, UpdateMeInput } from "~/types/api/auth";

export const useUserStore = defineStore("user", () => {
  const me = ref<MeProfile | null>(null);

  // Capture đồng bộ tại thời điểm khởi tạo store
  const config = useRuntimeConfig();
  const tokens = useAuthTokens();
  const { platformMe, platformAuthLogin, platformAuthLogout } = useApi();
  const { extractApiData, handleApiError } = useApiError();

  const token = computed(() => tokens.getAccessToken());
  const refreshToken = computed(() => tokens.getRefreshToken());
  const isLoaded = computed(() => Boolean(me.value));
  const user = computed(() => me.value?.user ?? null);
  const roles = computed(() => me.value?.roles ?? []);
  const permissions = computed(() => me.value?.permissions ?? []);
  const menus = computed<AntDMenuNode[]>(() => me.value?.menus ?? []);
  const mustChangePassword = computed(() => Boolean(me.value?.user?.must_change_password));
  const isAuthenticated = computed(() => Boolean(me.value || isTokenValid(tokens.getAccessToken())));

  const clearSession = () => {
    tokens.clearTokens();
    me.value = null;
  };

  /**
   * Tải thông tin tài khoản hiện tại từ GET /v1/platform/me
   */
  const fetchMe = async (force = false) => {
    if (!tokens.getAccessToken()) {
      me.value = null;
      return null;
    }
    if (me.value && !force) return me.value;

    const { data, error } = await platformMe.getClient();

    if (error.value) {
      me.value = null;
      return null;
    }

    me.value = (extractApiData(data) as MeProfile) ?? null;
    return me.value;
  };

  /**
   * Làm mới access token qua POST /v1/platform/auth/refresh
   */
  const refreshTokens = async () => {
    const rt = tokens.getRefreshToken();
    if (!rt || !isTokenValid(rt)) return false;

    return performTokenRefresh(config.public.apiBase || "", tokens);
  };

  /**
   * Đăng nhập qua POST /v1/platform/auth/login
   */
  const login = async (payload: LoginInput, _rememberMe = false) => {
    const { data, error } = await platformAuthLogin.post(payload);
    if (handleApiError(data, error, "Đăng nhập thất bại!")) {
      return false;
    }

    const loginData = extractApiData(data) as LoginOutput | null;
    if (!loginData?.access_token) {
      return false;
    }

    tokens.setTokens(loginData);
    await fetchMe(true);
    return true;
  };

  /**
   * Cập nhật hồ sơ cá nhân qua PATCH /v1/platform/me
   */
  const updateMe = async (payload: UpdateMeInput) => {
    const res = await platformMe.patch(payload);
    if (!res.error.value) {
      await fetchMe(true);
    }
    return res;
  };

  /**
   * Đăng xuất qua POST /v1/platform/auth/logout và xóa token
   */
  const logout = async () => {
    if (tokens.getAccessToken()) {
      await platformAuthLogout.post({});
    }
    clearSession();
    await navigateTo("/login");
  };

  return {
    me,
    token,
    refreshToken,
    isLoaded,
    user,
    roles,
    permissions,
    menus,
    mustChangePassword,
    isAuthenticated,
    fetchMe,
    updateMe,
    refreshTokens,
    login,
    logout,
    clearSession,
  };
});
