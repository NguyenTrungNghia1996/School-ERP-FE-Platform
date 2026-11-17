<template>
  <slot v-if="allowed" />
  <slot v-else name="no-permission" />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    code: string | string[];
    all?: boolean;
  }>(),
  {
    all: false,
  },
);

const { hasAnyPermission, hasAllPermissions } = usePermission();

const allowed = computed(() => {
  const codes = Array.isArray(props.code) ? props.code.filter(Boolean) : [props.code].filter(Boolean);
  if (!codes.length) return true;
  return props.all ? hasAllPermissions(codes) : hasAnyPermission(codes);
});
</script>
