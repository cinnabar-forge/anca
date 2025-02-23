import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import config from "./src/server/config";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess()
    })
  ],
  base: "/",
  publicDir: "assets",
  build: {
    outDir: "./dist/web"
  },
  server: {
    allowedHosts: config.devWebHost ? [config.devWebHost] : undefined,
    port: config.devWebPort,
    https: config.sslEnabled
      ? {
          key: config.sslKeyPath || undefined,
          cert: config.sslCertPath || undefined
        }
      : undefined
  }
});
