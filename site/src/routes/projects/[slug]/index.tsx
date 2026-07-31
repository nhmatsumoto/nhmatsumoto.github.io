import { component$, useContext } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { getAllProjectSlugs, getProjectBySlug } from "../../../lib/content/projects";
import { LocaleContext } from "../../../lib/i18n/context";
import { translate } from "../../../lib/i18n/translate";
import { Breadcrumbs } from "../../../components/breadcrumbs/breadcrumbs";
import { EvidenceBlock } from "../../../components/evidence-block/evidence-block";
import { Icon } from "../../../components/icon/icon";
import { ICON_ARROW_UP_RIGHT, ICON_CODE_2, ICON_FOLDER_KANBAN } from "../../../lib/icons";
import { SITE_ORIGIN } from "../../../lib/site-config";

export const useProject = routeLoader$(async ({ params, status }) => {
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    status(404);
    throw new Error(`Project not found: ${params.slug}`);
  }
  return project;
});

export const onStaticGenerate: StaticGenerateHandler = () => {
  return {
    params: getAllProjectSlugs().map((slug) => ({ slug })),
  };
};

export default component$(() => {
  const project = useProject();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        <Breadcrumbs
          items={[{ href: "/projects/", labelKey: "nav.projects", icon: ICON_FOLDER_KANBAN }]}
          current={project.value.frontmatter.title}
        />
      </header>
      <div class="page-two-column">
        <aside class="page-sidebar">
          <div class="sidebar-panel notebook-meta-panel">
            <div class="sidebar-header">
              <h2>{t("pages.project.status")}</h2>
            </div>
            <p>
              <span class="status-chip status-published">
                {project.value.frontmatter.status}
              </span>
            </p>
            <h3>{t("pages.project.stack")}</h3>
            <div class="stack-list">
              {project.value.frontmatter.stack.map((item) => (
                <span class="stack-chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <div class="tag-list">
              {project.value.frontmatter.tags.map((tag) => (
                <span class="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            {project.value.frontmatter.repoUrl && (
              <div class="sidebar-actions">
                <a
                  class="sidebar-link"
                  href={project.value.frontmatter.repoUrl}
                  target="_blank"
                  rel="noopener"
                >
                  <Icon paths={ICON_CODE_2} class="sidebar-link-icon" />
                  <span>{t("actions.code")}</span>
                  <Icon paths={ICON_ARROW_UP_RIGHT} class="external-icon" />
                </a>
              </div>
            )}
          </div>
        </aside>

        <div class="page-main">
          <article class="project-shell prose post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker">{t("pages.project.kicker")}</p>
              </div>
              <h1>{project.value.frontmatter.title}</h1>
              <p class="post-summary post-deck">{project.value.frontmatter.description}</p>
            </header>
            <div class="post-body" dangerouslySetInnerHTML={project.value.html} />
            <EvidenceBlock
              tradeoffs={project.value.frontmatter.tradeoffs}
              lessons={project.value.frontmatter.lessons}
            />
          </article>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const project = resolveValue(useProject);
  const canonical = `${SITE_ORIGIN}/projects/${project.slug}/`;
  return {
    title: `${project.frontmatter.title} | nhmatsumoto.github.io`,
    meta: [
      { name: "description", content: project.frontmatter.description },
      { property: "og:title", content: project.frontmatter.title },
      { property: "og:description", content: project.frontmatter.description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: project.frontmatter.title },
      { name: "twitter:description", content: project.frontmatter.description },
      { name: "x-body-class", content: "page-project" },
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
