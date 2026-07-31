import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllPosts } from "../../lib/content/posts";
import { FUNDAMENTOS_SLUGS } from "../../lib/content/curated-lists";
import { PostCard } from "../../components/post-card/post-card";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { SITE_ORIGIN } from "../../lib/site-config";

export const useFundamentosPosts = routeLoader$(async () => {
  const all = await getAllPosts();
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  return FUNDAMENTOS_SLUGS.map((slug) => bySlug.get(slug)).filter((p): p is NonNullable<typeof p> => p !== undefined);
});

export default component$(() => {
  const posts = useFundamentosPosts();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container">
      <header class="page-header">
        <h1>{t("pages.fundamentals.title")}</h1>
        <p class="section-copy">{t("pages.fundamentals.description")}</p>
      </header>

      <ol class="entry-list">
        {posts.value.map((post) => (
          <PostCard post={post} key={post.slug} />
        ))}
      </ol>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Fundamentos e Padrões de Projeto | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Base de engenharia de software: algoritmos, estruturas de dados, princípios de design, testes e padrões de projeto aplicados.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/fundamentos/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-archive" },
    { name: "x-has-math", content: "true" },
  ],
};
