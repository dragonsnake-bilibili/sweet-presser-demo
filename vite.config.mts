import { fileURLToPath, URL } from "node:url";
import Vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import { patchCssModules } from "vite-css-modules";
import Layouts from "vite-plugin-vue-layouts-next";
import Vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/sweet-presser-demo/",
  plugins: [
    Layouts(),
    AutoImport({
      imports: ["vue"],
      dts: "src/auto-imports.d.ts",
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
    Components({
      globs: ["src/components/*.vue"],
      dts: "src/components.d.ts",
    }),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: "src/styles/settings.scss",
      },
    }),
    patchCssModules({ generateSourceTypes: true }),
  ],
  optimizeDeps: {
    exclude: [
      "vuetify",
      "vue-router",
      "unplugin-vue-router/runtime",
      "unplugin-vue-router/data-loaders",
      "unplugin-vue-router/data-loaders/basic",
    ],
  },
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    port: 3000,
  },
});
