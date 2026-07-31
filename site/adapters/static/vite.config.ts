import { extendConfig } from "@builder.io/qwik-city/vite";
import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.ssr.tsx", "@qwik-city-plan"],
      },
      outDir: "dist",
      // build.client runs first and writes the client chunks + copies
      // public/ into dist/ — without this, Vite's default emptyOutDir
      // wipes all of that right before the SSG pass renders pages that
      // reference it (missing /build/*.js, missing /assets/styles.css).
      emptyOutDir: false,
    },
    plugins: [
      staticAdapter({
        origin: "https://nhmatsumoto.github.io",
      }),
    ],
  };
});
