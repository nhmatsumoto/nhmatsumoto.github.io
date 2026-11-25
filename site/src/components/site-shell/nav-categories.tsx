import {
  component$,
  useContext,
  useOnDocument,
  useSignal,
  $,
  type QRL,
} from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { NAV_GROUPS } from "../../lib/nav-links";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Icon } from "../icon/icon";

export const NavCategories = component$<{ onNavigate$?: QRL<() => void> }>(
  ({ onNavigate$ }) => {
    const locale = useContext(LocaleContext);
    const location = useLocation();
    const container = useSignal<HTMLElement>();

    useOnDocument(
      "click",
      $((event) => {
        const open =
          container.value?.querySelector<HTMLDetailsElement>("details[open]");
        if (
          open &&
          event.target instanceof Node &&
          !open.contains(event.target)
        )
          open.open = false;
      }),
    );

    return (
      <div
        class="nav-categories"
        ref={container}
        onKeyDown$={(event, element) => {
          if (event.key !== "Escape") return;
          const open =
            element.querySelector<HTMLDetailsElement>("details[open]");
          if (open) {
            open.open = false;
            open.querySelector("summary")?.focus();
          }
        }}
      >
        {NAV_GROUPS.map((group) => {
          const active = (href: string) =>
            location.url.pathname.startsWith(href);
          const links = group.links.map((link) => ({
            ...link,
            current: active(link.href) || link.activePaths?.some(active),
          }));
          return (
            <details
              class="nav-category"
              key={group.label}
              name={onNavigate$ ? "drawer-category" : "header-category"}
            >
              <summary
                class={{
                  "nav-link": true,
                  "is-active": links.some((link) => link.current),
                }}
              >
                {translate(group.label, locale.value)}
              </summary>
              <div class="nav-category-links">
                {links.map((link) => (
                  <a
                    key={link.href}
                    class={{ "nav-link": true, "is-active": link.current }}
                    href={link.href}
                    aria-current={link.current ? "page" : undefined}
                    onClick$={async (_, element) => {
                      const category = element.closest("details");
                      if (category) category.open = false;
                      await onNavigate$?.();
                    }}
                  >
                    <Icon paths={link.icon} class="nav-link-icon" />
                    <span>{translate(link.i18nKey, locale.value)}</span>
                  </a>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    );
  },
);
