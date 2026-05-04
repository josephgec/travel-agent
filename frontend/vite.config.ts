import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // HMR through Caddy on :80 — tell the client to connect there.
    hmr: { clientPort: 80 },
    watch: { usePolling: true },
  },
});
