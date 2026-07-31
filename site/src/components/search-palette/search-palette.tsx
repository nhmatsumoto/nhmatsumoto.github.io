import {
  $,
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";

interface SearchEntry {
  title: string;
  url: string;
  kind: string;
  description: string;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export const SearchPalette = component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  const isOpen = useSignal(false);
  const query = useSignal("");
  const activeIndex = useSignal(0);
  const store = useStore<{ entries: SearchEntry[]; loaded: boolean }>({
    entries: [],
    loaded: false,
  });

  const close = $(() => {
    isOpen.value = false;
  });

  const loadIndex = $(async () => {
    if (store.loaded) return;
    const res = await fetch("/assets/search-index.json");
    store.entries = await res.json();
    store.loaded = true;
  });

  const open = $(async () => {
    await loadIndex();
    isOpen.value = true;
    query.value = "";
    activeIndex.value = 0;
  });

  // Global Ctrl/Cmd-K shortcut — mirrors legacy blog.js's command palette.
  useVisibleTask$(({ cleanup }) => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      } else if (event.key === "Escape") {
        isOpen.value = false;
      }
    };
    document.addEventListener("keydown", onKeydown);
    cleanup(() => document.removeEventListener("keydown", onKeydown));
  }, { strategy: "document-ready" });

  const tokens = query.value.trim() ? normalize(query.value).split(/\s+/) : [];
  const results = tokens.length
    ? store.entries.filter((entry) => {
        const haystack = normalize(`${entry.title} ${entry.description}`);
        return tokens.every((token) => haystack.includes(token));
      })
    : store.entries;

  return (
    <>
      <button
        class="nav-btn-icon"
        type="button"
        onClick$={open}
        aria-label={t("search.title")}
      >
        {t("search.title")}
      </button>

      {isOpen.value && (
        <div class="search-overlay" role="dialog" aria-label={t("search.aria_dialog")}>
          <div class="search-backdrop" onClick$={close}></div>
          <div class="search-panel">
            <input
              type="text"
              class="search-input"
              placeholder={t("search.placeholder")}
              value={query.value}
              autoFocus
              onInput$={(_, el) => {
                query.value = el.value;
                activeIndex.value = 0;
              }}
              onKeyDown$={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  activeIndex.value = Math.min(activeIndex.value + 1, results.length - 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  activeIndex.value = Math.max(activeIndex.value - 1, 0);
                } else if (event.key === "Enter") {
                  const target = results[activeIndex.value];
                  if (target) window.location.href = target.url;
                } else if (event.key === "Escape") {
                  close();
                }
              }}
            />
            <p class="search-hint">{t("search.hint")}</p>
            {results.length === 0 ? (
              <p class="search-empty">{t("search.empty")}</p>
            ) : (
              <ul class="search-results">
                {results.slice(0, 20).map((entry, i) => (
                  <li key={entry.url} class={i === activeIndex.value ? "is-active" : ""}>
                    <a href={entry.url}>
                      <span class="search-result-title">{entry.title}</span>
                      <span class="search-result-desc">{entry.description}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
});
