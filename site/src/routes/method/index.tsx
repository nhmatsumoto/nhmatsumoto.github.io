import { component$, useContext } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Breadcrumbs } from "../../components/breadcrumbs/breadcrumbs";
import { Icon } from "../../components/icon/icon";
import { ARTICLE_STAGES } from "../../lib/content/knowledge";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { ICON_LIGHTBULB, ICON_NETWORK, ICON_SCALE } from "../../lib/icons";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

const PRINCIPLES = [
  { icon: ICON_SCALE, titleKey: "method.rule.title", copyKey: "method.rule.copy" },
  { icon: ICON_LIGHTBULB, titleKey: "method.evidence.title", copyKey: "method.evidence.copy" },
  { icon: ICON_NETWORK, titleKey: "method.operations.title", copyKey: "method.operations.copy" },
];

export default component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container method-page">
      <header class="page-header method-page-header">
        <Breadcrumbs items={[]} current={t("pages.method.title")} />
        <p class="section-kicker systems-kicker">METHOD / 01</p>
        <h1>{t("method.title")}</h1>
        <p class="method-page-description">{t("method.description")}</p>
      </header>

      <section class="method-cycle-panel">
        <header class="systems-section-header">
          <p class="section-kicker systems-kicker">{t("home.structure_kicker")}</p>
          <h2>{t("home.structure_title")}</h2>
        </header>
        <ol class="editorial-stage-list method-stage-list">
          {ARTICLE_STAGES.map((stage) => (
            <li class="editorial-stage" key={stage.number}>
              <span class="editorial-stage-number">{stage.number}</span>
              <div>
                <h3>{t(stage.methodTitleKey)}</h3>
                <p>{t(stage.methodDescriptionKey)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section class="method-principles">
        {PRINCIPLES.map((principle, index) => (
          <article class="method-principle" key={principle.titleKey}>
            <div class="method-principle-index">0{index + 1}</div>
            <Icon paths={principle.icon} class="method-principle-icon" />
            <h2>{t(principle.titleKey)}</h2>
            <p>{t(principle.copyKey)}</p>
          </article>
        ))}
      </section>

      <footer class="method-page-footer">
        <span>EDITORIAL CONTRACT / V1</span>
        <span>{SITE_NAME}</span>
      </footer>
    </div>
  );
});

export const head: DocumentHead = {
  title: `Método | ${SITE_NAME}`,
  meta: [
    { name: "description", content: "Um formato editorial para registrar contexto, decisões, operação e resultados." },
    { property: "og:url", content: `${SITE_ORIGIN}/method/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-method" },
    { name: "x-has-math", content: "false" },
  ],
};
