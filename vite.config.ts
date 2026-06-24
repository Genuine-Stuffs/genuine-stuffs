import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/web-ifc/web-ifc.wasm', dest: '.' }
      ]
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "backend": path.resolve(__dirname, "./backend"),
    },
  },
  optimizeDeps: {
    exclude: ["web-ifc"],
  },
  build: {
    rollupOptions: {},
  },
}));

