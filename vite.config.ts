import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "backend": path.resolve(__dirname, "./backend"),
    },
  },
  optimizeDeps: {
    // These packages use WebGL/WASM and must not be pre-bundled by Vite
    exclude: ["@thatopen/components", "web-ifc"],
  },
  build: {
    rollupOptions: {
      // Treat as external so Rollup never tries to statically analyse it
      // The dynamic import() in AECMassingView handles the runtime load
      external: [],
    },
  },
}));

