/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/components/**/*.{vue,js,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/plugins/**/*.{js,ts}",
    "./app/composables/**/*.{js,ts}",
    "./app/app.vue",
    "./app/error.vue",
    "./nuxt.config.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#004AAD", // Màu xanh dương thương hiệu chính xác theo Logo công ty
        brandGreen: "#7ED957", // Màu xanh lá thương hiệu theo Logo công ty
        success: "#7ED957", // Màu xanh lá cây (theo logo)
        warning: "#ECA100", // Màu vàng cam
        error: "#D32F2F", // Màu đỏ
      },
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
      },
      borderRadius: {
        ant: "8px",
      },
    },
  },
  plugins: [],
};
