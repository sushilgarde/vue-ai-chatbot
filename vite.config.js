import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin(), // Automatically injects CSS into the JS bundle
  ],
  build: {
    lib: {
      // The entry point is your index.js file
      entry: path.resolve(__dirname, "index.js"),
      name: "Vue3AiChatbot",
      fileName: (format) => `vue3-ai-chatbot.${format}.js`,
    },
    rollupOptions: {
      // DO NOT bundle these into your library
      external: ["vue", "quasar"],
      output: {
        globals: {
          vue: "Vue",
          quasar: "Quasar",
        },
      },
    },
  },
});
