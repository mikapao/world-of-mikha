import { defineConfig } from "vite";

export default defineConfig({
  // relative paths so the same build works inside the Android app AND on GitHub Pages
  base: "./",
  build: { outDir: "dist", chunkSizeWarningLimit: 1200 }
});
