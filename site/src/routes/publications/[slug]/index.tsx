import { component$ } from "@builder.io/qwik";
import type { DocumentHead, StaticGenerateHandler } from "@builder.io/qwik-city";
import { useLocation } from "@builder.io/qwik-city";
import { getAllPostSlugs } from "../../../lib/content/posts";
import { SITE_ORIGIN } from "../../../lib/site-config";

export const onStaticGenerate: StaticGenerateHandler = () => {
  return {
    params: getAllPostSlugs().map((slug) => ({ slug })),
  };
};

// /publications/<slug>/ used to be a byte-identical mirror of /posts/<slug>/
// (verified during the migration audit). Rather than carrying forward a
// second copy of every post, this is a thin noindex + canonical + meta
// refresh redirect — the standard substitute for a server-side redirect on
// a host that can't run one (GitHub Pages serves static files only).
export default component$(() => {
  const loc = useLocation();
  const target = `/posts/${loc.params.slug}/`;

  return (
    <p>
      Este conteúdo foi movido para <a href={target}>{target}</a>.
    </p>
  );
});

export const head: DocumentHead = ({ params }) => {
  const target = `${SITE_ORIGIN}/posts/${params.slug}/`;
  return {
    title: "Redirecionando… | nhmatsumoto.github.io",
    meta: [
      { name: "robots", content: "noindex" },
      { httpEquiv: "refresh", content: `0; url=${target}` },
    ],
    links: [{ rel: "canonical", href: target }],
    scripts: [{ script: `location.replace(${JSON.stringify(target)});` }],
  };
};
