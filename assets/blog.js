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
    const short = locale.split("-")[0].toUpperCase();
    document.querySelectorAll("[data-locale-label]").forEach(el => el.textContent = short);
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

const initIntelligencePanel = (loc) => {
  const panel = document.querySelector("[data-intelligence-panel]");
  const content = panel?.querySelector(".panel-content");
  if (!panel || !content) return;

  const elements = {
    role: panel.querySelector("[data-panel-role]"),
    name: panel.querySelector("[data-panel-name]"),
    headline: panel.querySelector("[data-panel-headline]"),
    summary: panel.querySelector("[data-panel-summary]"),
    stack: panel.querySelector("[data-panel-stack]"),
    metaRow: panel.querySelector("[data-panel-meta-row]"),
    link: panel.querySelector("[data-panel-link]")
  };

  const syncTechnicalContent = () => {
    if (window.mermaid) {
      try {
        // Find existing svgs and remove them to avoid duplication if re-rendering
        panel.querySelectorAll(".mermaid[data-processed]").forEach(el => {
          el.removeAttribute("data-processed");
          el.innerHTML = el.getAttribute("data-original-code") || el.innerHTML;
        });
        window.mermaid.init(undefined, panel.querySelectorAll(".mermaid"));
      } catch (err) {
        console.error("Mermaid error:", err);
      }
    }
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([panel]).catch(err => console.error("MathJax error:", err));
    }
  };

  const updatePanelUI = (data) => {
    if (!data) return;
    const locale = useStore.getState().locale;
    const suffix = locale.split("-")[0]; // e.g. "en", "ja"

    const getName = (d) => d[`name_${suffix}`] || d[`title_${suffix}`] || d.name || d.title || "";
    const getHeadline = (d) => d[`headline_${suffix}`] || d.headline || "";
    const getSummary = (d) => d[`summary_${suffix}`] || d.summary || "";
    const getBody = (d) => d[`body_html_${suffix}`] || d.body_html || getSummary(d);

    if (elements.role) {
      const kind = data.kind || "knowledge";
      elements.role.textContent = loc?.translate(`kinds.${kind}`, kind) || kind;
    }
    
    if (elements.name) elements.name.textContent = getName(data);
    if (elements.headline) elements.headline.textContent = getHeadline(data);
    
    if (elements.summary) {
      const body = getBody(data);
      if (typeof body === 'string' && (body.includes('<') || data.body_html)) {
        elements.summary.innerHTML = body;
        elements.summary.querySelectorAll(".mermaid").forEach(m => {
          if (!m.getAttribute("data-original-code")) m.setAttribute("data-original-code", m.innerHTML);
        });
      } else {
        elements.summary.textContent = body;
      }
    }

    if (elements.stack) {
      elements.stack.innerHTML = (data.stack || []).map(s => `<span class="stack-chip">${s}</span>`).join("");
    }

    if (elements.metaRow) {
      const meta = [];
      if (data.published_dt) {
        const date = new Date(data.published_dt);
        meta.push(`<span>${new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(date)}</span>`);
      }
      if (data.reading_time) meta.push(`<span>${data.reading_time} min</span>`);
      if (data.category) meta.push(`<span>${data.category}</span>`);
      elements.metaRow.innerHTML = meta.join(" &middot; ");
    }

    if (elements.link) {
      elements.link.href = data.resolved_url || data.url || "#";
      const actionKey = data.kind === "project" ? "actions.view_project" : "actions.read_article";
      elements.link.innerHTML = `<i data-lucide="eye"></i> ${loc?.translate(actionKey, "View")} <i data-lucide="arrow-right"></i>`;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Trigger rendering after a short delay to ensure DOM is ready
    setTimeout(syncTechnicalContent, 50);
  };

  useStore.subscribe((state, prevState) => {
    // Detect open/close
    if (state.panelOpen !== prevState.panelOpen) {
      panel.dataset.open = String(state.panelOpen);
      panel.setAttribute("aria-hidden", String(!state.panelOpen));
      if (content) content.dataset.revealed = String(state.panelOpen);
      
      // Ensure UI is updated when opening
      if (state.panelOpen && state.panelData) {
        updatePanelUI(state.panelData);
      }
    }

    // Detect data changes specifically
    if (state.panelData !== prevState.panelData && state.panelData && state.panelOpen) {
      updatePanelUI(state.panelData);
    }
  });

  // Export globals for non-module legacy support
  window.showIntelligencePanel = (data) => useStore.getState().togglePanel(true, data);
  window.hideIntelligencePanel = () => useStore.getState().togglePanel(false);

  panel.querySelectorAll("[data-panel-close], .panel-backdrop").forEach(el => {
    el.addEventListener("click", () => window.hideIntelligencePanel());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.hideIntelligencePanel();
  });
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

const initVisualizationToggle = () => {
  const navBtn = document.querySelector("[data-vis-toggle]");
  if (!navBtn) return;

  navBtn.addEventListener("click", () => {
    // Sync store
    const currentMode = useStore.getState().visMode;
    const nextMode = currentMode === 'atomo' ? 'arvore' : 'atomo';
    useStore.getState().setVisMode(nextMode);

    // Update UI icons
    document.querySelectorAll(".vis-icon-atom").forEach(el => el.classList.toggle("hidden", nextMode === 'arvore'));
    document.querySelectorAll(".vis-icon-tree").forEach(el => el.classList.toggle("hidden", nextMode === 'atomo'));

    // Trigger existing engine logic
    if (window.projectMap) {
      window.projectMap.setLayout(nextMode);
    } else {
      const btvTrigger = document.getElementById("btv-trigger");
      if (btvTrigger) btvTrigger.click();
    }
  });

  // Sync initial icons
  const initialMode = useStore.getState().visMode;
  document.querySelectorAll(".vis-icon-atom").forEach(el => el.classList.toggle("hidden", initialMode === 'arvore'));
  document.querySelectorAll(".vis-icon-tree").forEach(el => el.classList.toggle("hidden", initialMode === 'atomo'));
};

const initCommandPalette = (loc) => {
  const palette = document.querySelector("[data-command-palette]");
  const input = palette?.querySelector("[data-palette-input]");
  const results = palette?.querySelector("[data-palette-results]");
  if (!palette || !input || !results) return;

  let index = null;
  const loadIndex = async () => {
    if (index) return index;
    const res = await fetch(palette.dataset.searchIndex || "https://nhmatsumoto.github.io/search-index.json");
    index = res.ok ? await res.json() : [];
    return index;
  };

  const search = async (q) => {
    const items = await loadIndex();
    const query = q.trim().toLowerCase();
    const filtered = query 
      ? items.filter(it => (it.title + it.summary + (it.keywords?.join(" ") ?? "")).toLowerCase().includes(query))
      : items;

    results.innerHTML = filtered.length 
      ? filtered.slice(0, 10).map(it => `
        <li>
          <a href="${it.url}" class="palette-result">
            <span class="result-kind">${loc?.translate(`kinds.${it.kind}`, it.kind)}</span>
            <div class="result-info">
              <strong class="result-title">${it.title}</strong>
              <small class="result-summary">${it.summary}</small>
            </div>
          </a>
        </li>`).join("")
      : `<li class="palette-empty">${loc?.translate("palette.empty", "No results found.")}</li>`;
  };

  const setOpen = (open) => {
    palette.hidden = !open;
    document.body.dataset.paletteOpen = String(open);
    if (open) {
      input.focus();
      search(input.value);
    }
  };

  document.querySelectorAll("[data-open-palette]").forEach(b => b.addEventListener("click", () => setOpen(true)));
  document.querySelectorAll("[data-close-palette]").forEach(b => b.addEventListener("click", () => setOpen(false)));
  input.addEventListener("input", (e) => search(e.target.value));
  
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(palette.hidden); }
    if (e.key === "Escape") setOpen(false);
  });
};

const initCodeBlocks = () => {
  document.querySelectorAll(".code-shell").forEach(shell => {
    const btn = shell.querySelector(".code-shell-copy");
    const code = shell.querySelector("code");
    if (!btn || !code) return;

    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(code.textContent);
      const original = btn.innerHTML;
      btn.innerHTML = '<span style="color:var(--accent)">Done</span>';
      setTimeout(() => btn.innerHTML = original, 2000);
    });
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

// --- DOM Content Loaded ---

document.addEventListener("DOMContentLoaded", () => {
  const loc = initLocalization();
  initThemeManager();
  initLocaleToggle(loc);
  initVisualizationToggle();
  initCommandPalette(loc);
  initIntelligencePanel(loc);
  initCodeBlocks();
  initInteractiveGlow();
  
  // Cleanup old sidebar if exists
  document.body.removeAttribute('data-sidebar-open');
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (typeof window.initKnowledgeGraph === 'function') window.initKnowledgeGraph(loc);
});
