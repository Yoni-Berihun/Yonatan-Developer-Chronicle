import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the API runs on :4000 and Vite proxies /api to it. In
// production Express serves the built site and the API from one origin, so the
// session cookie stays first-party in both places.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
