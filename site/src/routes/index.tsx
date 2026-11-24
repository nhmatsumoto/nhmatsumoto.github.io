import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllPosts } from "../lib/content/posts";
import { getAllProjects } from "../lib/content/projects";
import { getAllDocuments } from "../lib/content/documents";
import { PostCard } from "../components/post-card/post-card";
import { ProjectCard } from "../components/project-card/project-card";
import { DocumentCard } from "../components/document-card/document-card";
import { Icon } from "../components/icon/icon";
import { LocaleContext } from "../lib/i18n/context";
import { translate } from "../lib/i18n/translate";
import {
  ICON_BOT,
  ICON_FILE_TEXT,
  ICON_FOLDER_KANBAN,
  ICON_LAYERS,
  ICON_NEWSPAPER,
  ICON_USER_ROUND,
} from "../lib/icons";
import { SITE_NAME, SITE_ORIGIN } from "../lib/site-config";

const NAV_GRID = [
  { href: "/about/", icon: ICON_USER_ROUND, key: "nav.about" },
  { href: "/posts/", icon: ICON_NEWSPAPER, key: "nav.posts" },
  { href: "/fundamentos/", icon: ICON_LAYERS, key: "nav.fundamentals" },
  { href: "/ia/", icon: ICON_BOT, key: "nav.ai" },
  { href: "/projects/", icon: ICON_FOLDER_KANBAN, key: "nav.projects" },
  { href: "/documents/", icon: ICON_FILE_TEXT, key: "nav.documents" },
];

export const useHomeData = routeLoader$(async () => {
  const [posts, projects, documents] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
    getAllDocuments(),
  ]);
  return {
    posts: posts.slice(0, 3),
    projects: projects.slice(0, 3),
    documents: documents.slice(0, 3),
  };
});

export default component$(() => {
  const data = useHomeData();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container home-shell">
      <section class="notebook-hero section-panel">
        <div class="notebook-hero-copy">
          <p class="section-kicker">{SITE_NAME}</p>
          <h1 class="notebook-hero-title">{SITE_NAME}</h1>
          <div class="notebook-link-row">
            {NAV_GRID.map((link) => (
              <a class="notebook-link-chip" href={link.href} key={link.href}>
                {t(link.key)}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div class="home-stack">
        <section class="section-panel">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("nav.posts")}</p>
              <h2>{t("sections.posts_title")}</h2>
            </div>
          </header>
          <ol class="entry-list">
            {data.value.posts.map((post) => (
              <PostCard post={post} key={post.slug} />
            ))}
          </ol>
        </section>

        <section class="section-panel">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("nav.projects")}</p>
              <h2>{t("sections.projects_title")}</h2>
            </div>
          </header>
          <ol class="entry-list">
            {data.value.projects.map((project) => (
              <ProjectCard project={project} key={project.slug} />
            ))}
          </ol>
        </section>

        <section class="section-panel">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("nav.documents")}</p>
              <h2>{t("sections.documents_title")}</h2>
            </div>
          </header>
          <div class="documents-panel-body">
            <ol class="entry-list document-list">
              {data.value.documents.map((doc) => (
                <DocumentCard doc={doc} key={doc.slug} />
              ))}
            </ol>
          </div>
        </section>

        <section class="section-panel navigation-grid">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("sections.navigation_kicker")}</p>
              <h2>{t("sections.navigation_title")}</h2>
            </div>
          </header>
          <div class="navigation-grid-links">
            {NAV_GRID.map((link) => (
              <a class="nav-link" href={link.href} key={link.href}>
                <Icon paths={link.icon} />
                <span class="icon-label">{t(link.key)}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: SITE_NAME,
  meta: [
    { property: "og:url", content: `${SITE_ORIGIN}/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-home" },
    { name: "x-has-math", content: "false" },
  ],
};
