import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 部署在 https://<user>.github.io/<repo>/ 底下，所以 base 要帶 repo 名。
// CI 會用 VITE_BASE 覆蓋；本機 dev 走 "/"。
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  server: {
    fs: {
      // 允許讀 repo 根目錄的 shared/guard-rules.json
      allow: [fileURLToPath(new URL("..", import.meta.url))],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
