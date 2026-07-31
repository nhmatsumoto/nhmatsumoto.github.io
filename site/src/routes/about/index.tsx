import { component$, useContext } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Breadcrumbs } from "../../components/breadcrumbs/breadcrumbs";
import { Icon } from "../../components/icon/icon";
import { ICON_FOLDER_KANBAN, ICON_GIT_BRANCH, ICON_NETWORK } from "../../lib/icons";
import { SITE_ORIGIN } from "../../lib/site-config";

const SECTORS = [
  "home.sector_payments",
  "home.sector_telecom",
  "home.sector_mobility",
  "home.sector_education",
  "home.sector_finance",
  "home.sector_manufacturing",
  "home.sector_erp",
];

// [label, i18nKey] — most stack names are proper nouns kept literal across
// locales; a few are ordinary words that do get translated (see dictionary).
const TOOLKIT: [string, string | null][] = [
  [".NET Core", null],
  ["C#", null],
  ["Arquitetura", "about.chip_architecture"],
  ["DDD", null],
  ["Clean Architecture", null],
  ["CQRS", null],
  ["SQL Server", null],
  ["APIs", null],
  ["TypeScript", null],
  ["GIS", null],
  ["Agentes", "about.chip_agents"],
  ["Documentação", "about.chip_documentation"],
];

export default component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container page-stack">
      <header class="page-header">
        <Breadcrumbs items={[]} current={t("nav.about")} />
        <section class="page-heading about-page-heading">
          <p class="section-kicker">{t("nav.about")}</p>
          <h1>Hiro Matsumoto</h1>
          <p>{t("about.summary")}</p>
        </section>
      </header>

      <article class="post-shell prose about-narrative about-professional">
        <section class="about-professional-hero about-hero-nophoto">
          <div class="about-professional-copy">
            <p class="section-kicker">{t("about.hero_kicker")}</p>
            <h2>{t("about.hero_title")}</h2>
            <p class="about-professional-lede">{t("about.hero_lede")}</p>
            <div class="about-meta-row">
              <span>{t("about.meta_1")}</span>
              <span>{t("about.meta_2")}</span>
              <span>{t("about.meta_3")}</span>
            </div>
            <div class="about-action-row">
              <a class="about-action-link" href="https://github.com/nhmatsumoto" target="_blank" rel="noopener noreferrer">
                <Icon paths={ICON_GIT_BRANCH} />
                <span>GitHub</span>
              </a>
              <a class="about-action-link" href="https://www.linkedin.com/in/hiroyukims/" target="_blank" rel="noopener noreferrer">
                <Icon paths={ICON_NETWORK} />
                <span>LinkedIn</span>
              </a>
              <a class="about-action-link" href="/projects/">
                <Icon paths={ICON_FOLDER_KANBAN} />
                <span>{t("about.action_projects")}</span>
              </a>
            </div>
          </div>
          <aside class="about-now-card">
            <p class="section-kicker">{t("about.now_kicker")}</p>
            <h3>{t("about.now_title")}</h3>
            <ul class="about-now-list">
              <li>{t("about.now_1")}</li>
              <li>{t("about.now_2")}</li>
              <li>{t("about.now_3")}</li>
            </ul>
          </aside>
        </section>

        <section class="about-section">
          <div class="about-section-head">
            <p class="section-kicker">{t("about.focus_kicker")}</p>
            <h2>{t("about.focus_title")}</h2>
          </div>
          <div class="about-card-grid">
            <article class="about-skill-card">
              <h3>{t("about.card1_title")}</h3>
              <p>{t("about.card1_body")}</p>
            </article>
            <article class="about-skill-card">
              <h3>{t("about.card2_title")}</h3>
              <p>{t("about.card2_body")}</p>
            </article>
            <article class="about-skill-card">
              <h3>{t("about.card3_title")}</h3>
              <p>{t("about.card3_body")}</p>
            </article>
          </div>
        </section>

        <section class="about-section">
          <div class="about-section-head">
            <p class="section-kicker">{t("about.exp_kicker")}</p>
            <h2>{t("about.exp_title")}</h2>
          </div>
          <p>{t("about.exp_intro")}</p>
          <ul class="about-chip-list">
            {SECTORS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>

        <section class="about-section about-toolkit">
          <div class="about-section-head">
            <p class="section-kicker">{t("about.toolkit_kicker")}</p>
            <h2>{t("about.toolkit_title")}</h2>
          </div>
          <ul class="about-chip-list">
            {TOOLKIT.map(([label, key]) => (
              <li key={label}>{key ? t(key) : label}</li>
            ))}
          </ul>
        </section>

        <section class="about-section">
          <div class="about-section-head">
            <p class="section-kicker">{t("about.references_kicker")}</p>
            <h2>{t("about.references_title")}</h2>
            <p>{t("about.references_intro")}</p>
          </div>
          <div class="contact-grid">
            <article class="resource-card contact-card">
              <p class="card-type">{t("about.ref_type_repo")}</p>
              <h3>
                <a href="https://github.com/nhmatsumoto/sos_location" target="_blank" rel="noopener noreferrer">
                  SOS Location
                </a>
              </h3>
              <p class="card-summary">{t("about.ref_sos_body")}</p>
            </article>
            <article class="resource-card contact-card">
              <p class="card-type">{t("about.ref_type_project")}</p>
              <h3>
                <a href="/projects/splitcosts/">SplitCosts</a>
              </h3>
              <p class="card-summary">{t("about.ref_splitcosts_body")}</p>
            </article>
            <article class="resource-card contact-card">
              <p class="card-type">{t("about.ref_type_docs")}</p>
              <h3>
                <a href="/documents/">Documentos e ADRs</a>
              </h3>
              <p class="card-summary">{t("about.ref_docs_body")}</p>
            </article>
          </div>
        </section>
      </article>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Sobre | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Arquiteto de sistemas com foco em .NET Core e C#. Domínio, APIs e decisões de arquitetura documentadas do jeito que sobrevive à saída de quem as tomou.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/about/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-about" },
    { name: "x-has-math", content: "false" },
  ],
};
