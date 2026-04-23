import useStore from './store.js';

const parseJsonScript = (id) => {
  const node = document.getElementById(id);
  if (!node) return null;
  try {
    return JSON.parse(node.textContent || "{}");
  } catch {
    return null;
  }
};

const resolvePath = (target, path) => {
  if (!target || !path) return undefined;
  return path.split(".").reduce((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return current[part];
    }
    return undefined;
  }, target);
};

const formatTemplate = (template, values) => {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, template);
};

const localeFieldKeys = (locale) => {
  const normalized = String(locale || "").trim().replaceAll("_", "-").toLowerCase();
  if (!normalized) return [];

  const keys = [];
  const add = (value) => {
    if (value && !keys.includes(value)) keys.push(value);
  };

  add(normalized.replaceAll("-", "_"));
  add(normalized.split("-")[0]);
  return keys;
};

const resolveLocalizedField = (data, fields, locale, fallback = "") => {
  if (!data) return fallback;
  const candidates = Array.isArray(fields) ? fields : [fields];

  for (const field of candidates) {
    for (const suffix of localeFieldKeys(locale)) {
      const value = data[`${field}_${suffix}`];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  for (const field of candidates) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) return value;
  }

  return fallback;
};

const syncRichContent = (root) => {
  if (!root) return;

  if (window.mermaid) {
    root.querySelectorAll(".mermaid").forEach(async el => {
      const original = el.getAttribute("data-original-code") || el.textContent || "";
      el.setAttribute("data-original-code", original);
      el.removeAttribute("data-processed");
      el.removeAttribute("data-mermaid-error");
      el.textContent = original;

      try {
        if (window.mermaid.run) {
          await window.mermaid.run({ nodes: [el] });
        } else {
          window.mermaid.init(undefined, el);
        }
      } catch (err) {
        console.error("Mermaid error:", err);
        el.dataset.mermaidError = "true";
        el.textContent = original;
      }
    });
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([root]).catch(err => console.error("MathJax error:", err));
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
};

// --- Initialization Functions ---

const initLocalization = () => {
  const config = parseJsonScript("site-i18n");
  if (!config) return null;

  const supportedLocales = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
  const strings = config.strings ?? {};
  const defaultLocale = config.defaultLocale ?? "pt-BR";

  const translate = (key, fallback = "", locale = useStore.getState().locale) => {
    const primary = resolvePath(strings[locale], key);
    if (typeof primary === "string") return primary;
    const secondary = resolvePath(strings[defaultLocale], key);
    if (typeof secondary === "string") return secondary;
    return fallback;
  };

  const applyTranslations = (locale) => {
    document.documentElement.lang = locale;
    document.body.dataset.locale = locale;

    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      if (!element.dataset.i18nFallback) element.dataset.i18nFallback = element.textContent || "";
      element.textContent = translate(key, element.dataset.i18nFallback, locale);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      const key = element.dataset.i18nPlaceholder;
      if (!element.dataset.i18nPlaceholderFallback) element.dataset.i18nPlaceholderFallback = element.getAttribute("placeholder") || "";
      element.setAttribute("placeholder", translate(key, element.dataset.i18nPlaceholderFallback, locale));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
      const key = element.dataset.i18nAriaLabel;
      if (!element.dataset.i18nAriaFallback) element.dataset.i18nAriaFallback = element.getAttribute("aria-label") || "";
      element.setAttribute("aria-label", translate(key, element.dataset.i18nAriaFallback, locale));
    });

    // Formatting Helpers
    const shortFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
    const longFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
    
    document.querySelectorAll("[data-localize-date]").forEach(el => {
      const date = new Date(el.getAttribute("datetime"));
      if (!isNaN(date)) el.textContent = (el.dataset.localizeDate === "short" ? shortFormatter : longFormatter).format(date);
    });

    const rtTemplate = translate("templates.reading_time", "{minutes} min read", locale);
    document.querySelectorAll("[data-reading-time]").forEach(el => {
      el.textContent = formatTemplate(rtTemplate, { minutes: el.dataset.readingTime });
    });

    document.querySelectorAll("[data-status-key]").forEach(el => {
      if (!el.dataset.i18nFallback) el.dataset.i18nFallback = el.textContent || "";
      el.textContent = translate(el.dataset.statusKey, el.dataset.i18nFallback, locale);
    });
    
    // Update locale label in navbar
    const localeCode = String(locale || "").toUpperCase();
    document.querySelectorAll("[data-locale-label]").forEach(el => el.textContent = localeCode);
  };

  // Subscribe to locale changes
  useStore.subscribe((state, prevState) => {
    if (state.locale !== prevState.locale) {
      applyTranslations(state.locale);
    }
  });

  // Initial apply
  applyTranslations(useStore.getState().locale);

  return { translate, getSupportedLocales: () => supportedLocales };
};

const initThemeManager = () => {
  const updateThemeUI = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-icon-moon").forEach(el => el.classList.toggle("hidden", theme === "light"));
    document.querySelectorAll(".theme-icon-sun").forEach(el => el.classList.toggle("hidden", theme === "dark"));
  };

  useStore.subscribe((state, prevState) => {
    if (state.theme !== prevState.theme) {
      updateThemeUI(state.theme);
    }
  });

  // Initial UI state
  updateThemeUI(useStore.getState().theme);

  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = useStore.getState().theme;
      useStore.getState().setTheme(current === "dark" ? "light" : "dark");
      
      toggle.animate([
        { transform: "rotate(0) scale(1)" },
        { transform: "rotate(15deg) scale(1.2)", offset: 0.5 },
        { transform: "rotate(0) scale(1)" }
      ], { duration: 300, easing: "ease-out" });
    });
  }
};

const initContactCardsLocalization = () => {
  const cards = document.querySelectorAll("[data-contact-card]");
  if (!cards.length) return;

  const apply = (locale) => {
    cards.forEach(card => {
      const script = card.querySelector("[data-contact-card-data]");
      const target = card.querySelector("[data-contact-description]");
      if (!script || !target) return;
      let data;
      try { data = JSON.parse(script.textContent || "{}"); } catch { return; }
      if (!target.dataset.fallback) target.dataset.fallback = target.textContent || "";
      const value = resolveLocalizedField(data, "description", locale, target.dataset.fallback);
      target.textContent = value || target.dataset.fallback;
    });
  };

  useStore.subscribe((state, prevState) => {
    if (state.locale !== prevState.locale) apply(state.locale);
  });
  apply(useStore.getState().locale);
};

const initPageContentLocalization = () => {
  const data = parseJsonScript("page-content-data");
  if (!data) return;

  const elements = {
    title: document.querySelector("[data-page-title]"),
    summary: document.querySelector("[data-page-summary]"),
    body: document.querySelector("[data-page-body]"),
    fields: document.querySelectorAll("[data-page-field]"),
    breadcrumb: document.querySelector(".breadcrumbs [aria-current='page']"),
    description: document.querySelector('meta[name="description"]')
  };

  const originalDocumentTitle = document.title;
  const siteTitle = originalDocumentTitle.includes(" | ")
    ? originalDocumentTitle.split(" | ").slice(1).join(" | ")
    : "";

  const applyPageContent = (locale) => {
    const title = resolveLocalizedField(data, ["title", "name"], locale, elements.title?.dataset.pageFallback || "");
    const summary = resolveLocalizedField(data, ["summary", "headline"], locale, elements.summary?.dataset.pageFallback || "");
    const bodyHtml = resolveLocalizedField(data, "body_html", locale, elements.body?.dataset.pageFallbackHtml || "");

    if (elements.title) {
      if (!elements.title.dataset.pageFallback) {
        elements.title.dataset.pageFallback = elements.title.textContent || "";
      }
      elements.title.textContent = title || elements.title.dataset.pageFallback;
    }

    if (elements.summary) {
      if (!elements.summary.dataset.pageFallback) {
        elements.summary.dataset.pageFallback = elements.summary.textContent || "";
      }
      elements.summary.textContent = summary || elements.summary.dataset.pageFallback;
    }

    if (elements.body) {
      if (!elements.body.dataset.pageFallbackHtml) {
        elements.body.dataset.pageFallbackHtml = elements.body.innerHTML;
      }
      elements.body.innerHTML = bodyHtml || elements.body.dataset.pageFallbackHtml;
      setTimeout(() => syncRichContent(elements.body), 50);
    }

    elements.fields.forEach(element => {
      const field = element.dataset.pageField;
      if (!field) return;
      if (!element.dataset.pageFallback) {
        element.dataset.pageFallback = element.textContent || "";
      }
      element.textContent = resolveLocalizedField(data, field, locale, element.dataset.pageFallback);
    });

    if (elements.breadcrumb) {
      if (!elements.breadcrumb.dataset.pageFallback) {
        elements.breadcrumb.dataset.pageFallback = elements.breadcrumb.textContent || "";
      }
      elements.breadcrumb.textContent = title || elements.breadcrumb.dataset.pageFallback;
    }

    if (elements.description && summary) {
      elements.description.setAttribute("content", summary);
    }

    if (title) {
      document.title = siteTitle ? `${title} | ${siteTitle}` : title;
    } else {
      document.title = originalDocumentTitle;
    }
  };

  useStore.subscribe((state, prevState) => {
    if (state.locale !== prevState.locale) {
      applyPageContent(state.locale);
    }
  });

  applyPageContent(useStore.getState().locale);
};

const initProfileContentLocalization = () => {
  const data = parseJsonScript("profile-content-data");
  if (!data) return;

  const fields = document.querySelectorAll("[data-profile-field]");
  if (!fields.length) return;

  const applyProfileContent = (locale) => {
    fields.forEach(element => {
      const field = element.dataset.profileField;
      if (!field) return;
      if (!element.dataset.profileFallback) {
        element.dataset.profileFallback = element.textContent || "";
      }
      element.textContent = resolveLocalizedField(data, field, locale, element.dataset.profileFallback);
    });
  };

  useStore.subscribe((state, prevState) => {
    if (state.locale !== prevState.locale) {
      applyProfileContent(state.locale);
    }
  });

  applyProfileContent(useStore.getState().locale);
};

const initEntryCardsLocalization = () => {
  const cards = document.querySelectorAll("[data-entry-card]");
  if (!cards.length) return;

  const apply = (locale) => {
    cards.forEach(card => {
      const script = card.querySelector("[data-entry-card-data]");
      if (!script) return;
      let data;
      try { data = JSON.parse(script.textContent || "{}"); } catch { return; }

      const titleEl = card.querySelector("[data-entry-title]");
      const ledeEl = card.querySelector("[data-entry-lede]");

      if (titleEl) {
        if (!titleEl.dataset.fallback) titleEl.dataset.fallback = titleEl.textContent || "";
        const value = resolveLocalizedField(data, ["name", "title"], locale, titleEl.dataset.fallback);
        titleEl.textContent = value || titleEl.dataset.fallback;
      }

      if (ledeEl) {
        if (!ledeEl.dataset.fallback) ledeEl.dataset.fallback = ledeEl.textContent || "";
        const value = resolveLocalizedField(data, ["headline", "summary"], locale, ledeEl.dataset.fallback);
        ledeEl.textContent = value || ledeEl.dataset.fallback;
      }
    });
  };

  useStore.subscribe((state, prevState) => {
    if (state.locale !== prevState.locale) apply(state.locale);
  });
  apply(useStore.getState().locale);
};

const initLocaleToggle = (loc) => {
  const btns = document.querySelectorAll("[data-locale-toggle]");
  const supported = loc?.getSupportedLocales() || [];
  if (!btns.length || supported.length < 2) return;

  btns.forEach(btn => btn.addEventListener("click", () => {
    const current = useStore.getState().locale;
    const idx = supported.indexOf(current);
    const next = supported[(idx + 1) % supported.length];
    useStore.getState().setLocale(next);

    btn.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.15)", offset: 0.4 },
      { transform: "scale(1)" }
    ], { duration: 250, easing: "ease-out" });
  }));
};



const initCodeBlocks = (loc) => {
  document.querySelectorAll(".code-shell").forEach(shell => {
    const btn = shell.querySelector(".code-shell-copy");
    const pre = shell.querySelector("pre");
    if (!btn || !pre) return;

    btn.addEventListener("click", async () => {
      const code = pre.textContent;
      try {
        await navigator.clipboard.writeText(code);
        
        shell.classList.add("is-copied");
        const feedback = btn.querySelector(".copy-feedback");
        if (feedback) {
          const originalText = feedback.textContent;
          feedback.textContent = loc?.translate("actions.copied", "Copiado!") || "Copiado!";
          setTimeout(() => {
            shell.classList.remove("is-copied");
            feedback.textContent = originalText;
          }, 2000);
        } else {
           setTimeout(() => shell.classList.remove("is-copied"), 2000);
        }
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  });
};


const initNavDrawer = () => {
  const toggles = document.querySelectorAll("[data-nav-toggle]");
  const drawer = document.getElementById("mobile-drawer");
  if (!toggles.length || !drawer) return;

  const setOpen = (open) => {
    document.body.dataset.navOpen = String(open);
    drawer.setAttribute("aria-hidden", String(!open));
    
    // Sync icons
    document.querySelectorAll(".menu-icon-open").forEach(el => el.classList.toggle("hidden", open));
    document.querySelectorAll(".menu-icon-close").forEach(el => el.classList.toggle("hidden", !open));
  };

  toggles.forEach(t => t.addEventListener("click", () => {
    const isOpen = document.body.dataset.navOpen === "true";
    setOpen(!isOpen);
  }));

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.dataset.navOpen === "true") setOpen(false);
  });

  // Close on link click (drawer links)
  drawer.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => setOpen(false));
  });

  // Close on resize if > 1024px
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024 && document.body.dataset.navOpen === "true") {
      setOpen(false);
    }
  });
};

const initInteractiveGlow = () => {

  const updateCoords = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };
  document.querySelectorAll(".resource-card, .project-card-premium, .post-card, .document-card").forEach(el => {
    el.addEventListener("mousemove", updateCoords);
  });
};

const initAnalyticsHelpers = () => {
  window.siteAnalytics = window.siteAnalytics || {};
  window.siteAnalytics.track = (eventName, params = {}) => {
    if (!eventName) return false;
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
      return true;
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
      return true;
    }
    return false;
  };
};

const initNavbarScroll = () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  const updateNavbar = () => {
    if (window.scrollY > 12) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }
  };
  
  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
};

// --- DOM Content Loaded ---

document.addEventListener("DOMContentLoaded", () => {
  initAnalyticsHelpers();
  const loc = initLocalization();
  initPageContentLocalization();
  initProfileContentLocalization();
  initEntryCardsLocalization();
  initContactCardsLocalization();
  initThemeManager();
  initLocaleToggle(loc);
  initCodeBlocks(loc);
  initInteractiveGlow();
  initNavDrawer();
  initNavbarScroll();
  
  // Cleanup old sidebar if exists
  document.body.removeAttribute('data-sidebar-open');
  
  if (typeof lucide !== 'undefined') lucide.createIcons();

});
