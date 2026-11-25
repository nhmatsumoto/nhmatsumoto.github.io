import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { PostCard } from "../components/post-card/post-card";
import { Icon } from "../components/icon/icon";
import { TechIcon } from "../components/tech-icon/tech-icon";
import { getAllPosts } from "../lib/content/posts";
import {
  ARTICLE_STAGES,
  HOME_KNOWLEDGE_DOMAINS,
} from "../lib/content/knowledge";
import { LocaleContext } from "../lib/i18n/context";
import { translate } from "../lib/i18n/translate";
import { SITE_NAME, SITE_ORIGIN } from "../lib/site-config";
import {
  TECH_ICON_CSS3,
  TECH_ICON_CSHARP,
  TECH_ICON_DOTNET,
  TECH_ICON_HTML5,
  TECH_ICON_JAVASCRIPT,
  TECH_ICON_MYSQL,
  TECH_ICON_REACT,
  TECH_ICON_SQLSERVER,
  TECH_ICON_TYPESCRIPT,
} from "../lib/tech-icons";

const PROFILE_TECHNOLOGIES = [
  { name: ".NET", markup: TECH_ICON_DOTNET },
  { name: "C#", markup: TECH_ICON_CSHARP },
  { name: "React", markup: TECH_ICON_REACT },
  { name: "TypeScript", markup: TECH_ICON_TYPESCRIPT },
  { name: "JavaScript", markup: TECH_ICON_JAVASCRIPT },
  { name: "SQL Server", markup: TECH_ICON_SQLSERVER },
  { name: "MySQL", markup: TECH_ICON_MYSQL },
  { name: "HTML", markup: TECH_ICON_HTML5 },
  { name: "CSS", markup: TECH_ICON_CSS3 },
];

export const useHomePosts = routeLoader$(async () => {
  const posts = await getAllPosts();
  return posts.slice(0, 3);
});

export default component$(() => {
  const posts = useHomePosts();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container systems-home">
      <section class="systems-hero">
        <div class="systems-hero-copy">
          <p class="section-kicker systems-kicker">{t("home.hero_kicker")}</p>
          <h1>{t("home.hero_title")}</h1>
          <p class="systems-hero-description">{t("home.hero_description")}</p>
          <div class="systems-hero-actions">
            <a class="systems-action-primary" href="/dotnet/">
              {t("home.view_focus")}
            </a>
            <a class="systems-action-secondary" href="/posts/">
              {t("home.view_knowledge")}
            </a>
          </div>
        </div>

        <aside class="systems-map" aria-label={t("home.domains_title")}>
          <header class="systems-map-header">
            <span>SYSTEM / REFERENCE MAP</span>
            <span>{t("sections.navigation_kicker")}</span>
          </header>
          <div class="systems-map-core">
            <span class="systems-map-core-mark" aria-hidden="true">
              S
            </span>
            <span>{SITE_NAME}</span>
            <small>{t("home.system_boundary")}</small>
          </div>
          <div class="systems-map-domains">
            {HOME_KNOWLEDGE_DOMAINS.map((domain) => (
              <a class="systems-map-node" href={domain.route} key={domain.slug}>
                <Icon paths={domain.icon} />
                <span>{t(domain.titleKey)}</span>
              </a>
            ))}
          </div>
          <p class="systems-map-caption">{t("home.system_map_caption")}</p>
        </aside>
      </section>

      <section class="profile-overview" aria-label={t("home.profile_title")}>
        <header class="profile-overview-heading">
          <p class="section-kicker systems-kicker">
            {t("home.profile_kicker")}
          </p>
          <h2>{t("home.profile_title")}</h2>
          <p>{t("home.profile_description")}</p>
        </header>
        <dl class="profile-facts">
          <div>
            <dt>{t("home.profile_role_label")}</dt>
            <dd>{t("home.profile_role")}</dd>
          </div>
          <div>
            <dt>{t("home.profile_base_label")}</dt>
            <dd>{t("home.profile_base")}</dd>
          </div>
          <div>
            <dt>{t("home.profile_focus_label")}</dt>
            <dd>{t("home.profile_focus")}</dd>
          </div>
        </dl>
        <div class="profile-tech-stack">
          <h3>{t("home.profile_stack_label")}</h3>
          <ul class="profile-tech-list">
            {PROFILE_TECHNOLOGIES.map((technology) => (
              <li key={technology.name}>
                <TechIcon markup={technology.markup} />
                <span>{technology.name}</span>
              </li>
            ))}
          </ul>
          <p>{t("home.profile_stack_more")}</p>
        </div>
      </section>

      <section class="systems-section domain-overview">
        <header class="systems-section-header">
          <p class="section-kicker systems-kicker">
            {t("home.domains_kicker")}
          </p>
          <h2>{t("home.domains_title")}</h2>
          <p>{t("home.domains_description")}</p>
        </header>
        <div class="domain-card-grid">
          {HOME_KNOWLEDGE_DOMAINS.map((domain) => (
            <a class="domain-card" href={domain.route} key={domain.slug}>
              <Icon paths={domain.icon} class="domain-card-icon" />
              <h3>{t(domain.titleKey)}</h3>
              <p>{t(domain.descriptionKey)}</p>
            </a>
          ))}
        </div>
      </section>

      <section class="systems-section editorial-cycle">
        <header class="systems-section-header editorial-cycle-header">
          <p class="section-kicker systems-kicker">
            {t("home.structure_kicker")}
          </p>
          <h2>{t("home.structure_title")}</h2>
          <p>{t("home.structure_description")}</p>
        </header>
        <ol class="editorial-stage-list">
          {ARTICLE_STAGES.map((stage) => (
            <li class="editorial-stage" key={stage.number}>
              <span class="editorial-stage-number">{stage.number}</span>
              <div>
                <h3>{t(stage.titleKey)}</h3>
                <p>{t(stage.descriptionKey)}</p>
              </div>
            </li>
          ))}
        </ol>
        <a class="systems-inline-link" href="/method/">
          {t("home.view_method")}
        </a>
      </section>

      <section class="systems-section knowledge-collection">
        <header class="systems-section-header collection-header">
          <div>
            <p class="section-kicker systems-kicker">
              {t("home.collection_kicker")}
            </p>
            <h2>{t("home.collection_title")}</h2>
          </div>
          <a class="systems-inline-link" href="/posts/">
            {t("home.view_knowledge")}
          </a>
        </header>
        {posts.value.length > 0 ? (
          <ol class="entry-list">
            {posts.value.map((post) => (
              <PostCard post={post} key={post.slug} />
            ))}
          </ol>
        ) : (
          <div class="collection-empty-state">
            <span class="collection-empty-mark" aria-hidden="true">
              ∅
            </span>
            <div>
              <h3>{t("home.empty_title")}</h3>
              <p>{t("home.empty_description")}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: SITE_NAME,
  meta: [
    {
      name: "description",
      content:
        "Senior Full Stack Developer com foco em .NET e C#, arquitetura, dados e aplicações web. Referências sobre IA Evaluation, infraestrutura e segurança.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-home" },
    { name: "x-has-math", content: "false" },
  ],
};
