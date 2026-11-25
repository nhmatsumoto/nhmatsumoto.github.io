import { $, component$, useContext, type Signal } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { NAV_LINKS } from "../../lib/nav-links";

interface MobileDrawerProps {
  drawerOpen: Signal<boolean>;
}

export const MobileDrawer = component$<MobileDrawerProps>(({ drawerOpen }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const loc = useLocation();
  const pathname = loc.url.pathname;
  const isLinkActive = (href: string, activePaths?: string[]) =>
    pathname.startsWith(href) ||
    (activePaths ?? []).some((path) => pathname.startsWith(path));

  const onClose = $(() => {
    drawerOpen.value = false;
  });

  return (
    <div class="nav-drawer" id="mobile-drawer" aria-hidden={!drawerOpen.value}>
      <div class="drawer-backdrop" onClick$={onClose}></div>
      <div class="drawer-content">
        <div class="drawer-links">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href, link.activePaths);
            return (
              <a
                key={link.href}
                class={`nav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                href={link.href}
                onClick$={onClose}
              >
                <Icon paths={link.icon} class="nav-link-icon" />
                <span class="icon-label">{t(link.i18nKey)}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
});
