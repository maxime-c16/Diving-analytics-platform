import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  server: {
    host: true,
    port: 4100,
  },
  vite: {
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          "process.env.NODE_ENV": JSON.stringify("development"),
        },
      },
    },
    server: {
      host: true,
      port: 4100,
    },
  },
});
