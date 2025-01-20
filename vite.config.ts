import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tauriConf from "./src-tauri/tauri.conf.json";
import { execSync } from "child_process";

function getAppVersion() {
  if (process.env.CI) return tauriConf.version;
  const gitSha = execSync("git rev-parse HEAD").toString().trim();
  return `${tauriConf.version}-${gitSha.slice(0, 8)}`;
}
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
