import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export default component$(() => (
  <p>
    Esta trilha está em <a href="/architecture/">/architecture/</a>.
  </p>
));

export const head: DocumentHead = {
  title: `Redirecionando | ${SITE_NAME}`,
  meta: [
    { name: "robots", content: "noindex" },
    { httpEquiv: "refresh", content: `0; url=${SITE_ORIGIN}/architecture/` },
  ],
  links: [{ rel: "canonical", href: `${SITE_ORIGIN}/architecture/` }],
  scripts: [{ script: `location.replace(${JSON.stringify(`${SITE_ORIGIN}/architecture/`)});` }],
};
