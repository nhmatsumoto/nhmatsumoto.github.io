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
        // The built-in generator can't exclude the /publications/ noindex
        // redirect stubs, so it's replaced by a hand-rolled endpoint route
        // (src/routes/sitemap.xml) with full control over what's listed.
        sitemapOutFile: null,
      }),
    ],
  };
});
