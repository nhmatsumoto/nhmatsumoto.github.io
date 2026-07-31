import { component$, useContext } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { getAllPostSlugs, getPostBySlug } from "../../../lib/content/posts";
import { LocaleContext } from "../../../lib/i18n/context";
import { translate } from "../../../lib/i18n/translate";
import { formatDateLong } from "../../../lib/format-date";
import { Breadcrumbs } from "../../../components/breadcrumbs/breadcrumbs";
import { EvidenceBlock } from "../../../components/evidence-block/evidence-block";
import { Icon } from "../../../components/icon/icon";
import { ICON_CALENDAR_DAYS, ICON_CLOCK_3, ICON_NEWSPAPER } from "../../../lib/icons";
import { SITE_ORIGIN } from "../../../lib/site-config";

export const usePost = routeLoader$(async ({ params, status }) => {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    status(404);
    throw new Error(`Post not found: ${params.slug}`);
  }
  return post;
});

export const onStaticGenerate: StaticGenerateHandler = () => {
  return {
    params: getAllPostSlugs().map((slug) => ({ slug })),
  };
};

export default component$(() => {
  const post = usePost();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const dateText = formatDateLong(post.value.frontmatter.date, localeSignal.value);

  return (
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        <Breadcrumbs
          items={[{ href: "/posts/", labelKey: "nav.posts", icon: ICON_NEWSPAPER }]}
          current={post.value.frontmatter.title}
        />
      </header>
      <div class="page-two-column">
        <aside class="page-sidebar post-detail-sidebar">
          <div class="sidebar-panel notebook-meta-panel post-meta-panel">
            <div class="post-sidebar-section post-sidebar-section-meta">
              <div class="sidebar-header">
                <h2>{t("pages.post.metadata")}</h2>
              </div>
              <div class="card-metrics">
                <span class="metric">
                  <Icon paths={ICON_CALENDAR_DAYS} class="meta-icon" />
                  <time dateTime={post.value.frontmatter.date}>{dateText}</time>
                </span>
                <span class="metric">
                  <Icon paths={ICON_CLOCK_3} class="meta-icon" />
                  <span>{post.value.frontmatter.readingTime} min de leitura</span>
                </span>
              </div>
            </div>
            {post.value.frontmatter.badges.length > 0 && (
              <div class="post-sidebar-section">
                <div class="badge-list">
                  {post.value.frontmatter.badges.map((badge) => (
                    <span class="badge" key={badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {post.value.frontmatter.tags.length > 0 && (
              <div class="post-sidebar-section">
                <div class="tag-list">
                  {post.value.frontmatter.tags.map((tag) => (
                    <span class="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div class="page-main">
          <article class="post-shell prose post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker">{t("pages.post.kicker")}</p>
                <div class="post-meta post-meta-hero">
                  <span class="post-meta-item">
                    <Icon paths={ICON_CALENDAR_DAYS} class="meta-icon" />
                    <time dateTime={post.value.frontmatter.date}>{dateText}</time>
                  </span>
                  <span class="post-meta-item">
                    <Icon paths={ICON_CLOCK_3} class="meta-icon" />
                    <span>{post.value.frontmatter.readingTime} min de leitura</span>
                  </span>
                </div>
              </div>
              <h1>{post.value.frontmatter.title}</h1>
              <p class="post-summary post-deck">{post.value.frontmatter.description}</p>
            </header>
            <div class="post-body" dangerouslySetInnerHTML={post.value.html} />
            <EvidenceBlock
              tradeoffs={post.value.frontmatter.tradeoffs}
              lessons={post.value.frontmatter.lessons}
            />
          </article>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(usePost);
  const canonical = `${SITE_ORIGIN}/posts/${post.slug}/`;
  return {
    title: `${post.frontmatter.title} | nhmatsumoto.github.io`,
    meta: [
      { name: "description", content: post.frontmatter.description },
      { property: "og:title", content: post.frontmatter.title },
      { property: "og:description", content: post.frontmatter.description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: post.frontmatter.title },
      { name: "twitter:description", content: post.frontmatter.description },
      { name: "x-body-class", content: "page-post" },
      { name: "x-has-math", content: post.frontmatter.hasMath ? "true" : "false" },
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
