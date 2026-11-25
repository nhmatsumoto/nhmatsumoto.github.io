import { component$, useContext } from "@builder.io/qwik";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";

const FOOTER_LINKS = [
  { href: "/method/", key: "nav.method" },
  { href: "/posts/", key: "nav.posts" },
  { href: "/projects/", key: "nav.projects" },
  { href: "/documents/", key: "nav.documents" },
];

export const Footer = component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <footer class="site-footer architecture-footer">
      <div class="layout-container site-footer-inner">
        <a class="architecture-footer-brand" href="/">
          <span>{t("brand.name")}</span>
          <small>Systems / Knowledge / Operations</small>
        </a>
        <nav class="architecture-footer-links" aria-label={t("sections.navigation_kicker")}>
          {FOOTER_LINKS.map((link) => (
            <a href={link.href} key={link.href}>{t(link.key)}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
});
