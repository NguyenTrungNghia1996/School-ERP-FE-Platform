import process from "node:process";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@antdv-next/nuxt", "@pinia/nuxt", "@nuxt/icon"],
  postcss: {
    plugins: {
      "tailwindcss/nesting": false,
    },
  },
  antd: {
    icon: true,
  },
  build: {
    transpile: ["@ant-design/colors", "@ant-design/fast-color"],
  },
  nitro: {
    externals: {
      inline: [/@ant-design\/(colors|fast-color)/],
    },
  },
  css: ["antdv-next/dist/reset.css", "antdv-next/dist/antd.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_BASE_URL || "https://api.nghia196.qzz.io/api",
    },
  },
  vite: {
    optimizeDeps: {
      include: ["@vue/devtools-core"],
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
});
