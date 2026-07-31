import { component$, useContext } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { getAllDocumentSlugs, getDocumentBySlug } from "../../../lib/content/documents";
import { LocaleContext } from "../../../lib/i18n/context";
import { translate } from "../../../lib/i18n/translate";
import { Breadcrumbs } from "../../../components/breadcrumbs/breadcrumbs";
import { Icon } from "../../../components/icon/icon";
import { ICON_FILE_TEXT, ICON_FOLDER, ICON_GIT_BRANCH } from "../../../lib/icons";
import { SITE_ORIGIN } from "../../../lib/site-config";

export const useDocument = routeLoader$(async ({ params, status }) => {
  const doc = await getDocumentBySlug(params.slug);
  if (!doc) {
    status(404);
    throw new Error(`Document not found: ${params.slug}`);
  }
  return doc;
});

export const onStaticGenerate: StaticGenerateHandler = () => {
  return {
    params: getAllDocumentSlugs().map((slug) => ({ slug })),
  };
};

export default component$(() => {
  const doc = useDocument();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        <Breadcrumbs
          items={[
            { href: "/documents/", labelKey: "nav.documents", icon: ICON_FILE_TEXT },
          ]}
          current={doc.value.frontmatter.title}
        />
      </header>
      <div class="page-two-column document-page-layout">
        <aside class="page-sidebar">
          <section class="document-page-meta" aria-label="Metadados do documento">
            <p class="document-page-meta-label">{t("pages.document.meta")}</p>
            <div class="document-page-meta-row">
              <p class="doc-version">
                <Icon paths={ICON_GIT_BRANCH} class="meta-icon" />
                {doc.value.frontmatter.version}
              </p>
              <p class="doc-category">
                <Icon paths={ICON_FOLDER} class="meta-icon" />
                {doc.value.frontmatter.category}
              </p>
            </div>
            <div class="tag-list document-page-meta-tags">
              {doc.value.frontmatter.tags.map((tag) => (
                <span class="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </aside>

        <div class="page-main">
          <article class="document-shell prose post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker">{t("pages.document.kicker")}</p>
              </div>
              <h1>{doc.value.frontmatter.title}</h1>
              <p class="post-summary post-deck">{doc.value.frontmatter.description}</p>
            </header>
            <div
              class="post-body"
              dangerouslySetInnerHTML={doc.value.html}
            />
          </article>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const doc = resolveValue(useDocument);
  const canonical = `${SITE_ORIGIN}/documents/${doc.slug}/`;
  return {
    title: `${doc.frontmatter.title} | nhmatsumoto.github.io`,
    meta: [
      { name: "description", content: doc.frontmatter.description },
      { property: "og:title", content: doc.frontmatter.title },
      { property: "og:description", content: doc.frontmatter.description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: doc.frontmatter.title },
      { name: "twitter:description", content: doc.frontmatter.description },
      { name: "x-body-class", content: "page-document" },
      { name: "x-has-math", content: "false" },
    ],
    links: [
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "nhmatsumoto.github.io RSS",
        href: `${SITE_ORIGIN}/feed.xml`,
      },
    ],
  };
};
