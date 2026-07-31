import { $, component$, useContext, type Signal } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { Icon } from "../icon/icon";
import { ThemeToggle } from "../theme-toggle/theme-toggle";
import { LocaleToggle } from "../locale-toggle/locale-toggle";
import { SearchPalette } from "../search-palette/search-palette";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { NAV_LINKS } from "../../lib/nav-links";
import { ICON_MENU, ICON_X } from "../../lib/icons";

interface NavbarProps {
  drawerOpen: Signal<boolean>;
}

export const Navbar = component$<NavbarProps>(({ drawerOpen }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const loc = useLocation();
  const pathname = loc.url.pathname;

  const onToggleDrawer = $(() => {
    drawerOpen.value = !drawerOpen.value;
  });

  return (
    <nav class="navbar" data-nav-shell>
      <div class="layout-container navbar-mobile">
        <div class="navbar-left">
          <button
            class="nav-btn-icon nav-btn-menu navbar-toggle mobile-only"
            type="button"
            onClick$={onToggleDrawer}
            aria-label={t("nav.menu_open")}
            aria-controls="mobile-drawer"
            aria-expanded={drawerOpen.value}
          >
            <Icon
              paths={drawerOpen.value ? ICON_X : ICON_MENU}
              class={drawerOpen.value ? "menu-icon-close" : "menu-icon-open"}
            />
          </button>

          <div class="nav-brand desktop-only">
            <a class="nav-title" href="/">
              <span class="brand-accent">NHM</span>ATSUMOTO
            </a>
          </div>
        </div>

        <div class="navbar-center">
          <div class="nav-brand navbar-brand-mobile mobile-only">
            <a class="nav-title" href="/">
              <span class="brand-accent">NHM</span>ATSUMOTO
            </a>
          </div>

          <div class="nav-primary-links desktop-only">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                class={`nav-link${pathname.startsWith(link.href) ? " is-active" : ""}`}
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                href={link.href}
              >
                <Icon paths={link.icon} class="nav-link-icon" />
                <span class="icon-label">{t(link.i18nKey)}</span>
              </a>
            ))}
          </div>
        </div>

        <div class="nav-actions navbar-right">
          <div class="nav-group nav-group-mobile mobile-only">
            <SearchPalette />
            <LocaleToggle />
            <ThemeToggle class="nav-btn-theme-mobile" />
          </div>

          <div class="nav-group desktop-only">
            <SearchPalette />
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
});
