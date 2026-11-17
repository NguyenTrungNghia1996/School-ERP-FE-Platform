import { storeToRefs } from "pinia";

export const useAuth = () => {
  const userStore = useUserStore();
  const { me, user, roles, permissions, menus, isAuthenticated } = storeToRefs(userStore);

  return {
    me,
    user,
    roles,
    permissions,
    menus,
    isAuthenticated,
    fetchMe: userStore.fetchMe,
    login: userStore.login,
    logout: userStore.logout,
  };
};
