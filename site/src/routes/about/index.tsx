import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export default component$(() => (
  <p>
    Esta seção está em <a href="/method/">/method/</a>.
  </p>
));

export const head: DocumentHead = {
  title: `Redirecionando | ${SITE_NAME}`,
  meta: [
    { name: "robots", content: "noindex" },
    { httpEquiv: "refresh", content: `0; url=${SITE_ORIGIN}/method/` },
  ],
  links: [{ rel: "canonical", href: `${SITE_ORIGIN}/method/` }],
  scripts: [{ script: `location.replace(${JSON.stringify(`${SITE_ORIGIN}/method/`)});` }],
};
