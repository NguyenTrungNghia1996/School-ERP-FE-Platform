import { message } from "antdv-next";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith("/api/")) return;

  const bypassRoutes = [
    "/403",
    "/forbidden",
    "/no-permission",
    "/404",
    "/not-found",
    "/500",
    "/server-error",
    "/login",
    "/force-change-password",
    "/change-password",
    "/profile",
  ];
  if (bypassRoutes.includes(to.path)) return;

  const userStore = useUserStore();
  const { isLoaded, canAccess, fetchMe } = usePermission();

  if (!isLoaded.value && userStore.token) {
    await fetchMe();
  }

  const normalizedPath = to.path !== "/" && to.path.endsWith("/") ? to.path.slice(0, -1) : to.path;

  if (normalizedPath === "" || normalizedPath === "/" || normalizedPath === "/dashboard") {
    return;
  }

  if (!canAccess(normalizedPath)) {
    if (import.meta.client) {
      message.error("Bạn không có quyền truy cập vào đường dẫn này!");
    }
    return navigateTo({
      path: "/403",
      query: { path: to.fullPath || to.path },
    });
  }
});
