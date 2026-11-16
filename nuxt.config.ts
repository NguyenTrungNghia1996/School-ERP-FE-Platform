// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@antdv-next/nuxt"],
  postcss: {
    plugins: {
      "tailwindcss/nesting": false,
    },
  },
  antd: {
    icon: true,
  },
  css: ["antdv-next/dist/reset.css", "antdv-next/dist/antd.css"],
  vite: {
    optimizeDeps: {
      include: ["@vue/devtools-core"],
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
});
