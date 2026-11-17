const checkAllowed = (permissions, value, modifiers = {}) => {
  if (!value) return true;
  const codes = Array.isArray(value) ? value.filter(Boolean) : [value];
  if (!codes.length) return true;

  if (modifiers.all) {
    return codes.every((code) => permissions.includes(code));
  }
  return codes.some((code) => permissions.includes(code));
};

const DISABLED_CLASSES = ["ant-btn-disabled", "pointer-events-none", "opacity-50", "cursor-not-allowed"];

const applyPermission = (el, binding, userStore) => {
  const allowed = checkAllowed(userStore.permissions || [], binding.value, binding.modifiers);

  if (binding.modifiers?.disable) {
    if (!allowed) {
      el.disabled = true;
      el.setAttribute("disabled", "disabled");
      el.setAttribute("aria-disabled", "true");
      el.classList.add(...DISABLED_CLASSES);
    } else {
      el.disabled = false;
      el.removeAttribute("disabled");
      el.removeAttribute("aria-disabled");
      el.classList.remove(...DISABLED_CLASSES);
    }
    return;
  }

  if (!allowed) {
    if (el.parentNode) {
      el._permComment = el._permComment || document.createComment("v-permission");
      el.parentNode.replaceChild(el._permComment, el);
    }
  } else if (el._permComment?.parentNode) {
    el._permComment.parentNode.replaceChild(el, el._permComment);
  }
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("permission", {
    mounted(el, binding) {
      const userStore = useUserStore(nuxtApp.$pinia);
      applyPermission(el, binding, userStore);
    },
    updated(el, binding) {
      const userStore = useUserStore(nuxtApp.$pinia);
      applyPermission(el, binding, userStore);
    },
    getSSRProps() {
      return {};
    },
  });
});
