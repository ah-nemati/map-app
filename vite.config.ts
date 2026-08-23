import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react({}),
    tailwindcss(),
  ],

  server: {
    watch: {
      usePolling: true,
      interval: 800,
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "leaflet";
            }

            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            ) {
              return "react";
            }

            if (id.includes("framer-motion")) {
              return "animation";
            }

            if (id.includes("lucide-react")) {
              return "icons";
            }
          }
        },
      },
    },

    chunkSizeWarningLimit: 1000,
  },
});
