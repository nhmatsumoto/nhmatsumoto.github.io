import { component$, useContext } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Breadcrumbs } from "../../components/breadcrumbs/breadcrumbs";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export default component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container page-stack">
      <header class="page-header">
        <Breadcrumbs items={[]} current={t("nav.contact")} />
        <section class="page-heading">
          <p class="section-kicker">{t("nav.contact")}</p>
          <h1>{t("nav.contact")}</h1>
        </section>
      </header>
      <section class="section-panel">
        <div class="contact-grid" />
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: SITE_NAME,
  meta: [
    { property: "og:url", content: `${SITE_ORIGIN}/contact/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-contact" },
    { name: "x-has-math", content: "false" },
  ],
};
