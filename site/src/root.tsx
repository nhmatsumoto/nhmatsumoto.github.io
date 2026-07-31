import {
  component$,
  isDev,
  useContext,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet, useDocumentHead } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";
import { ThemeContext, type Theme } from "./lib/theme/context";
import { LocaleContext, LOCALE_STORAGE_KEY } from "./lib/i18n/context";
import { LOCALES, type Locale } from "./lib/i18n/dictionary";
import { GTM_ALLOWED_HOSTNAME, GTM_ID } from "./lib/site-config";

import "./global.css";

export default component$(() => {
  const themeSignal = useSignal<"light" | "dark">("light");
  useContextProvider(ThemeContext, themeSignal);

  const localeSignal = useSignal<"pt-BR" | "en" | "ja">("pt-BR");
  useContextProvider(LocaleContext, localeSignal);

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        {!isDev && (
          <link
            rel="manifest"
            href={`${import.meta.env.BASE_URL}manifest.json`}
          />
        )}

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        <script
          dangerouslySetInnerHTML={`(function (w, d, s, l, i, allowedHostnames) {
  var hostname = w.location.hostname;
  if (allowedHostnames.length && allowedHostnames.indexOf(hostname) === -1) { return; }
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0];
  var j = d.createElement(s);
  var dl = l != 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', ${JSON.stringify(GTM_ID)}, ${JSON.stringify([GTM_ALLOWED_HOSTNAME])});`}
        />

        {/* Blocking, inline on purpose: must run before first paint to avoid a
            flash of the wrong theme. See ThemeToggle/ThemeContext for the
            client-side signal sync that runs after resume. */}
        <script
          dangerouslySetInnerHTML={`try{var __t=localStorage.getItem('site-theme');if(__t){document.documentElement.setAttribute('data-theme',__t);}}catch(e){}`}
        />

        <link rel="stylesheet" href="/assets/styles.css" />

        <RouterHead />
      </head>
      <AppBody gtmId={GTM_ID} />
    </QwikCityProvider>
  );
});

/**
 * A separate component (rather than inline JSX in root's <body>) purely so
 * useDocumentHead() has a QwikCityProvider descendant to read from — routes
 * set a "x-body-class" meta entry to control the page-{kind} class that
 * styles.css keys off of (page-document, page-post, page-project, ...).
 */
const AppBody = component$<{ gtmId: string }>(({ gtmId }) => {
  const head = useDocumentHead();
  const bodyClass =
    head.meta.find((m) => m.name === "x-body-class")?.content ?? "";
  const hasMath = head.meta.find((m) => m.name === "x-has-math")?.content === "true";

  const themeSignal = useContext(ThemeContext);
  const localeSignal = useContext(LocaleContext);

  // Runs once on mount (no track()): DOM/localStorage/query-string are the
  // source of truth for these, set before Qwik resumes (theme, via the
  // inline head script) or read here directly (locale has no such script).
  // Only syncs the *signal* to match reality — never writes back to the DOM
  // here, so there's no risk of racing the values a user just toggled.
  useVisibleTask$(() => {
    const domTheme = document.documentElement.getAttribute("data-theme");
    if (domTheme === "light" || domTheme === "dark") {
      themeSignal.value = domTheme as Theme;
    }

    const queryLocale = new URLSearchParams(location.search).get("lang");
    const storedLocale = (() => {
      try {
        return localStorage.getItem(LOCALE_STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    const resolved = [queryLocale, storedLocale].find((l): l is Locale =>
      LOCALES.includes(l as Locale),
    );
    if (resolved) {
      localeSignal.value = resolved;
      document.documentElement.setAttribute("lang", resolved);
    }
  });

  return (
    <body class={bodyClass} data-has-math={hasMath ? "true" : "false"}>
      <noscript
        dangerouslySetInnerHTML={`<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`}
      />
      <RouterOutlet />
    </body>
  );
});
