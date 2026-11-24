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
        <Breadcrumbs items={[]} current={t("nav.about")} />
        <section class="page-heading about-page-heading">
          <p class="section-kicker">{t("nav.about")}</p>
          <h1>{t("nav.about")}</h1>
        </section>
      </header>

      <article class="post-shell prose about-narrative about-professional">
        <section class="about-professional-hero about-hero-nophoto">
          <div class="about-professional-copy" />
          <aside class="about-now-card" />
        </section>
        <section class="about-section">
          <div class="about-section-head" />
          <div class="about-card-grid" />
        </section>
        <section class="about-section">
          <div class="about-section-head" />
        </section>
        <section class="about-section about-toolkit">
          <div class="about-section-head" />
        </section>
        <section class="about-section">
          <div class="about-section-head" />
          <div class="contact-grid" />
        </section>
      </article>
    </div>
  );
});

export const head: DocumentHead = {
  title: SITE_NAME,
  meta: [
    { property: "og:url", content: `${SITE_ORIGIN}/about/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-about" },
    { name: "x-has-math", content: "false" },
  ],
};
