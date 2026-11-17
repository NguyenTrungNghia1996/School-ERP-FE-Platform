import { isTokenValid } from "~/composables/useRequest";

export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore();

  const publicRoutes = ["/", "/login"];
  const publicStartWithRoutes: string[] = [];
  const isPublicRoute =
    publicRoutes.includes(to.path) ||
    publicStartWithRoutes.some((prefix) => to.path.startsWith(prefix));

  let isAuthenticated = isTokenValid(userStore.token);

  // Tự động làm mới token nếu access_token hết hạn nhưng còn refresh_token hợp lệ
  if (!isAuthenticated && isTokenValid(userStore.refreshToken)) {
    try {
      const refreshed = await userStore.refreshTokens();
      if (refreshed) {
        isAuthenticated = true;
      } else {
        userStore.clearSession();
        if (!isPublicRoute) return navigateTo("/login");
      }
    } catch (err) {
      console.error("Error refreshing token in auth middleware:", err);
      userStore.clearSession();
      if (!isPublicRoute) return navigateTo("/login");
    }
  }

  // Đã đăng nhập mà truy cập /login
  if (isPublicRoute && to.path === "/login" && isAuthenticated) {
    await userStore.fetchMe();
    if (userStore.mustChangePassword) {
      return navigateTo("/force-change-password");
    }
    return navigateTo("/dashboard");
  }

  if (isPublicRoute) return;

  // Chưa đăng nhập -> về /login
  if (!isAuthenticated) {
    userStore.clearSession();
    return navigateTo("/login");
  }

  // Tải thông tin tài khoản, quyền & menu từ GET /v1/platform/me
  if (!userStore.isLoaded) {
    await userStore.fetchMe();
  }

  // Kiểm tra cờ must_change_password từ iam.PlatformUser
  if (userStore.mustChangePassword && to.path !== "/force-change-password") {
    return navigateTo("/force-change-password");
  }
  if (!userStore.mustChangePassword && to.path === "/force-change-password") {
    return navigateTo("/dashboard");
  }
});
