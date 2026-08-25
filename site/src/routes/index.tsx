import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllPosts } from "../lib/content/posts";
import { getAllProjects } from "../lib/content/projects";
import { getAllDocuments } from "../lib/content/documents";
import { PostCard } from "../components/post-card/post-card";
import { ProjectCard } from "../components/project-card/project-card";
import { DocumentCard } from "../components/document-card/document-card";
import { Icon } from "../components/icon/icon";
import { TechIcon } from "../components/tech-icon/tech-icon";
import { LocaleContext } from "../lib/i18n/context";
import { translate } from "../lib/i18n/translate";
import {
  ICON_ARROW_UP_RIGHT,
  ICON_BOT,
  ICON_FILE_TEXT,
  ICON_FOLDER_KANBAN,
  ICON_GIT_BRANCH,
  ICON_LAYERS,
  ICON_NETWORK,
  ICON_NEWSPAPER,
  ICON_RSS,
  ICON_USER_ROUND,
} from "../lib/icons";
import {
  TECH_ICON_AZURE,
  TECH_ICON_CSHARP,
  TECH_ICON_CSS3,
  TECH_ICON_DOTNET,
  TECH_ICON_EFCORE,
  TECH_ICON_GIT,
  TECH_ICON_HTML5,
  TECH_ICON_JAVASCRIPT,
  TECH_ICON_JQUERY,
  TECH_ICON_MYSQL,
  TECH_ICON_REACT,
  TECH_ICON_SQLSERVER,
  TECH_ICON_TYPESCRIPT,
} from "../lib/tech-icons";
import { SITE_ORIGIN } from "../lib/site-config";

// [label, icon markup] — ASP.NET MVC has no dedicated devicon mark, so it
// reuses the .NET logo (same ecosystem); every other entry has its own.
const TECH_STACK: [string, string][] = [
  [".NET Core", TECH_ICON_DOTNET],
  ["C#", TECH_ICON_CSHARP],
  ["ASP.NET MVC", TECH_ICON_DOTNET],
  ["EF Core", TECH_ICON_EFCORE],
  ["SQL Server", TECH_ICON_SQLSERVER],
  ["MySQL", TECH_ICON_MYSQL],
  ["TypeScript", TECH_ICON_TYPESCRIPT],
  ["JavaScript", TECH_ICON_JAVASCRIPT],
  ["React", TECH_ICON_REACT],
  ["HTML5", TECH_ICON_HTML5],
  ["CSS", TECH_ICON_CSS3],
  ["jQuery", TECH_ICON_JQUERY],
  ["Azure", TECH_ICON_AZURE],
  ["Git", TECH_ICON_GIT],
];

const CONTACT_LINKS = [
  { href: "https://github.com/nhmatsumoto", label: "GitHub", icon: ICON_GIT_BRANCH },
  { href: "https://www.linkedin.com/in/hiroyukims/", label: "LinkedIn", icon: ICON_NETWORK },
  { href: "https://nhmatsumoto.github.io", label: "Site / Blog", icon: ICON_NEWSPAPER },
  { href: "/feed.xml", label: "RSS", icon: ICON_RSS },
];

const SECTORS = [
  "home.sector_payments", "home.sector_telecom", "home.sector_mobility",
  "home.sector_education", "home.sector_finance", "home.sector_manufacturing",
  "home.sector_erp",
];

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
      <header class="home-header">
        <section class="about-profile-card home-profile-card profile">
          <div class="about-profile-main profile-main">
            <p class="about-profile-handle">{t("profile.handle")}</p>
            <h1 class="home-profile-name profile-name">Hiro Matsumoto</h1>
            <p class="about-profile-bio profile-bio">{t("home.profile_bio")}</p>
            <section class="profile-contact-block profile-contact-compact">
              <p class="section-kicker profile-contact-kicker">{t("nav.contact")}</p>
              <h3 class="profile-contact-title">{t("pages.contact.title")}</h3>
              <p class="profile-contact-copy">{t("pages.contact.description")}</p>
              <ul class="profile-contact-links profile-links">
                {CONTACT_LINKS.map((link) => (
                  <li class="profile-contact-item" key={link.label}>
                    <a class="profile-contact-link" href={link.href} target="_blank" rel="noopener noreferrer">
                      <Icon paths={link.icon} class="profile-contact-icon" />
                      <span class="profile-contact-link-copy">
                        <span class="profile-contact-label">{link.label}</span>
                      </span>
                      <Icon paths={ICON_ARROW_UP_RIGHT} class="external-icon" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </header>

      <div class="home-stack">
        <section class="notebook-hero section-panel">
          <div class="notebook-hero-copy">
            <p class="section-kicker">{t("home.kicker")}</p>
            <h1 class="notebook-hero-title">{t("home.kicker")}</h1>
            <div class="prose notebook-intro">
              <p>{t("home.intro_p1")}</p>
              <p>{t("home.intro_p2")}</p>
            </div>
            <div class="notebook-stack">
              <p class="section-kicker" aria-hidden="true">{t("home.stack_kicker")}</p>
              <ul class="tech-chip-list notebook-stack-list">
                {TECH_STACK.map(([tech, icon]) => (
                  <li class="tech-chip" key={tech}>
                    <TechIcon markup={icon} class="tech-chip-icon" />
                    <span>{tech}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div class="notebook-link-row">
              {NAV_GRID.map((link) => (
                <a class="notebook-link-chip" href={link.href} key={link.href}>
                  {t(link.key)}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section class="section-panel profile-summary-panel">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("home.profile_kicker")}</p>
              <h2>{t("home.profile_title")}</h2>
            </div>
            <p class="section-copy">{t("home.profile_copy")}</p>
          </header>
          <div class="profile-summary-body">
            <p>{t("home.profile_body")}</p>
          </div>
          <div class="profile-metric-grid">
            <article class="profile-metric">
              <span class="profile-metric-value">2016</span>
              <span class="profile-metric-label">{t("home.metric_since")}</span>
            </article>
            <article class="profile-metric">
              <span class="profile-metric-value">6+</span>
              <span class="profile-metric-label">{t("home.metric_sectors")}</span>
            </article>
            <article class="profile-metric">
              <span class="profile-metric-value">EN</span>
              <span class="profile-metric-label">{t("home.metric_english")}</span>
            </article>
          </div>
          <div class="profile-detail-grid">
            <section class="profile-detail">
              <p class="section-kicker">{t("home.detail_sectors")}</p>
              <ul class="about-chip-list">
                {SECTORS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </section>
            <section class="profile-detail">
              <p class="section-kicker">{t("home.detail_practices")}</p>
              <ul class="about-chip-list">
                <li>SOLID</li>
                <li>DDD</li>
                <li>Clean Architecture</li>
                <li>APIs REST</li>
                <li>xUnit</li>
                <li>Microservices</li>
              </ul>
            </section>
            <section class="profile-detail">
              <p class="section-kicker">{t("home.detail_certs")}</p>
              <ul class="profile-cert-list">
                <li>Scrum Foundation Professional Certificate (SFPC)</li>
                <li>{t("home.cert_neural")}</li>
                <li>{t("home.cert_aspnet")}</li>
                <li>{t("home.cert_ads")}</li>
              </ul>
            </section>
          </div>
        </section>

        <section class="section-panel">
          <header class="section-header">
            <div>
              <p class="section-kicker">{t("nav.posts")}</p>
              <h2>{t("sections.posts_title")}</h2>
            </div>
            <p class="section-copy">{t("sections.posts_copy")}</p>
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
            <p class="section-copy">{t("sections.projects_copy")}</p>
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
            <p class="section-copy">{t("sections.documents_copy")}</p>
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
            <p>{t("sections.navigation_copy")}</p>
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
  title: "nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Caderno técnico sobre .NET/C#, arquitetura de sistemas, DDD e engenharia de agentes de IA.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-home" },
    { name: "x-has-math", content: "false" },
  ],
};
