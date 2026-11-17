export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("request", (event) => {
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.NUXT_PUBLIC_API_BASE;
    if (baseUrl) {
      useRuntimeConfig(event).public.apiBase = baseUrl;
    }
  });
});
