import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // sockjs-client 등이 Node 스타일 global을 참조할 때 브라우저에서 사용
    global: "globalThis",
  },
  server: {
    port: 3000,
  },
});
