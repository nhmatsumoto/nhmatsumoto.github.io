import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { SITE_ORIGIN } from "../../lib/site-config";

export default component$(() => {
  return (
    <p>
      Este conteúdo foi movido para <a href="/posts/">/posts/</a>.
    </p>
  );
});

export const head: DocumentHead = {
  title: "Redirecionando… | nhmatsumoto.github.io",
  meta: [
    { name: "robots", content: "noindex" },
    { httpEquiv: "refresh", content: `0; url=${SITE_ORIGIN}/posts/` },
  ],
  links: [{ rel: "canonical", href: `${SITE_ORIGIN}/posts/` }],
  scripts: [{ script: `location.replace(${JSON.stringify(`${SITE_ORIGIN}/posts/`)});` }],
};
