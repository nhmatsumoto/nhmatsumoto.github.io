import { component$, useContext } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Breadcrumbs } from "../../components/breadcrumbs/breadcrumbs";
import { SITE_ORIGIN } from "../../lib/site-config";

const CARDS = [
  {
    type: "code",
    href: "https://github.com/nhmatsumoto",
    label: "GitHub",
    descKey: "contact.card_github",
    url: "https://github.com/nhmatsumoto",
  },
  {
    type: "network",
    href: "https://www.linkedin.com/in/hiroyukims/",
    label: "LinkedIn",
    descKey: "contact.card_linkedin",
    url: "https://www.linkedin.com/in/hiroyukims/",
  },
  {
    type: "writing",
    href: "https://nhmatsumoto.github.io",
    label: "Site / Blog",
    descKey: "contact.card_site",
    url: "https://nhmatsumoto.github.io",
  },
  {
    type: "feed",
    href: "/feed.xml",
    label: "RSS",
    descKey: "contact.card_rss",
    url: "https://nhmatsumoto.github.io/feed.xml",
  },
];

export default component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container page-stack">
      <header class="page-header">
        <Breadcrumbs items={[]} current={t("nav.contact")} />
        <section class="page-heading">
          <p class="section-kicker">{t("nav.contact")}</p>
          <h1>{t("pages.contact.title")}</h1>
          <p>{t("pages.contact.description")}</p>
        </section>
      </header>
      <section class="section-panel">
        <div class="contact-grid">
          {CARDS.map((card) => (
            <article class="resource-card contact-card" key={card.label}>
              <p class="card-type">{card.type}</p>
              <h2>
                <a href={card.href} target="_blank" rel="noopener noreferrer">
                  {card.label}
                </a>
              </h2>
              <p class="card-summary">{t(card.descKey)}</p>
              <p class="contact-url">{card.url}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Contato | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/contact/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-contact" },
    { name: "x-has-math", content: "false" },
  ],
};
