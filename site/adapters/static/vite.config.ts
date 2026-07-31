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
    },
    plugins: [
      staticAdapter({
        origin: "https://nhmatsumoto.github.io",
      }),
    ],
  };
});
