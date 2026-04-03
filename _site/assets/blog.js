const parseJsonScript = (id) => {
  const node = document.getElementById(id);
  if (!node) {
    return null;
  }

  try {
    return JSON.parse(node.textContent || "{}");
  } catch {
    return null;
  }
};

const resolvePath = (target, path) => {
  if (!target || !path) {
    return undefined;
  }

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

const createLocalization = () => {
  const config = parseJsonScript("site-i18n");
  if (!config) {
    return null;
  }

  const supportedLocales = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
  const aliases = config.aliases ?? {};
  const strings = config.strings ?? {};
  const defaultLocale = config.defaultLocale ?? document.body.dataset.defaultLocale ?? "pt-BR";
  const storageKey = "site-locale";

  const resolveLocale = (candidate) => {
    if (!candidate) {
      return null;
    }

    const raw = String(candidate).trim();
    if (!raw) {
      return null;
    }

    if (supportedLocales.includes(raw)) {
      return raw;
    }

    const lowered = raw.toLowerCase();
    const aliased = aliases[lowered];
    if (aliased && supportedLocales.includes(aliased)) {
      return aliased;
    }

    const base = lowered.split("-")[0];
    const baseAlias = aliases[base];
    if (baseAlias && supportedLocales.includes(baseAlias)) {
      return baseAlias;
    }

    const supportedMatch = supportedLocales.find((locale) => locale.toLowerCase() === lowered);
    if (supportedMatch) {
      return supportedMatch;
    }

    return null;
  };

  const detectLocale = () => {
    const stored = resolveLocale(window.localStorage.getItem(storageKey));
    if (stored) {
      return stored;
    }

    const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);

    for (const browserLocale of browserLocales) {
      const resolved = resolveLocale(browserLocale);
      if (resolved) {
        return resolved;
      }
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneLocale = timezone ? resolveLocale(config.timezones?.[timezone]) : null;
    if (timezoneLocale) {
      return timezoneLocale;
    }

    return resolveLocale(defaultLocale) ?? "pt-BR";
  };

  let currentLocale = detectLocale();

  const translate = (key, fallback = "") => {
    const primary = resolvePath(strings[currentLocale], key);
    if (typeof primary === "string") {
      return primary;
    }

    const secondary = resolvePath(strings[defaultLocale], key);
    if (typeof secondary === "string") {
      return secondary;
    }

    return fallback;
  };

  const localizeDates = () => {
    const locale = currentLocale;
    const shortFormatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const longFormatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    for (const element of document.querySelectorAll("[data-localize-date]")) {
      const iso = element.getAttribute("datetime");
      if (!iso) {
        continue;
      }

      const date = new Date(iso);
      if (Number.isNaN(date.valueOf())) {
        continue;
      }

      const style = element.dataset.localizeDate ?? "long";
      element.textContent = style === "short" ? shortFormatter.format(date) : longFormatter.format(date);
    }
  };

  const localizeReadingTimes = () => {
    const template = translate("templates.reading_time", "{minutes} min read");
    for (const element of document.querySelectorAll("[data-reading-time]")) {
      const minutes = Number(element.dataset.readingTime ?? "0");
      element.textContent = formatTemplate(template, { minutes: Number.isFinite(minutes) ? minutes : 0 });
    }
  };

  const localizeStatuses = () => {
    for (const element of document.querySelectorAll("[data-status-key]")) {
      const key = element.dataset.statusKey;
      if (!key) {
        continue;
      }

      const fallback = element.dataset.i18nFallback || element.textContent || "";
      if (!element.dataset.i18nFallback) {
        element.dataset.i18nFallback = fallback;
      }
      element.textContent = translate(key, fallback);
    }
  };

  const applyTranslations = () => {
    document.documentElement.lang = currentLocale;
    document.body.dataset.locale = currentLocale;

    for (const element of document.querySelectorAll("[data-i18n]")) {
      const key = element.dataset.i18n;
      if (!key) {
        continue;
      }

      if (!element.dataset.i18nFallback) {
        element.dataset.i18nFallback = element.textContent || "";
      }

      element.textContent = translate(key, element.dataset.i18nFallback);
    }

    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
      const key = element.dataset.i18nPlaceholder;
      if (!key) {
        continue;
      }

      if (!element.dataset.i18nPlaceholderFallback) {
        element.dataset.i18nPlaceholderFallback = element.getAttribute("placeholder") || "";
      }

      element.setAttribute("placeholder", translate(key, element.dataset.i18nPlaceholderFallback));
    }

    for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
      const key = element.dataset.i18nAriaLabel;
      if (!key) {
        continue;
      }

      if (!element.dataset.i18nAriaFallback) {
        element.dataset.i18nAriaFallback = element.getAttribute("aria-label") || "";
      }

      element.setAttribute("aria-label", translate(key, element.dataset.i18nAriaFallback));
    }

    for (const select of document.querySelectorAll("[data-locale-switcher]")) {
      select.value = currentLocale;
    }

    localizeDates();
    localizeReadingTimes();
    localizeStatuses();
  };

  const setLocale = (locale, persist = true) => {
    const resolved = resolveLocale(locale) ?? resolveLocale(defaultLocale) ?? "pt-BR";
    currentLocale = resolved;
    if (persist) {
      window.localStorage.setItem(storageKey, resolved);
    }
    
    // Update cycle button text
    const cycleBtn = document.querySelector(".locale-cycle-btn .locale-current");
    if (cycleBtn) {
      cycleBtn.textContent = resolved.split("-")[0].upper();
    }

    applyTranslations();
    window.dispatchEvent(new CustomEvent("site:localechange", { detail: { locale: resolved } }));
  };

    return {
        applyTranslations,
        setLocale,
        translate,
        getLocale: () => currentLocale,
        getSupportedLocales: () => supportedLocales.slice(),
    };
};

const initLocaleSwitcher = (localization) => {
  if (!localization) {
    return;
  }

  for (const select of document.querySelectorAll("[data-locale-switcher]")) {
    select.addEventListener("change", (event) => {
      localization.setLocale(event.currentTarget.value);
    });
  }
};

const initLocaleToggle = (localization) => {
  const button = document.querySelector("[data-locale-toggle]");
  if (!localization || !button) {
    return;
  }

  button.addEventListener("click", () => {
    const locales = localization.getSupportedLocales();
    if (!locales.length) {
      return;
    }
    const current = localization.getLocale();
    const idx = locales.indexOf(current);
    const next = locales[(idx + 1) % locales.length] || locales[0];
    
    localization.setLocale(next);
    
    // Add a small rotation effect on click
    button.style.transform = "rotate(360deg)";
    setTimeout(() => {
      button.style.transform = "";
    }, 400);
  });
};

const enhanceCopyLink = (localization) => {
  const buttons = document.querySelectorAll("[data-copy-link]");
  for (const button of buttons) {
    const fallbackLabel = button.textContent || "";
    const reset = () => {
      const key = button.dataset.i18n;
      if (localization && key) {
        button.textContent = localization.translate(key, fallbackLabel);
        return;
      }
      button.textContent = fallbackLabel;
    };

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        button.textContent = localization?.translate("actions.link_copied", "Link copied") ?? "Link copied";
        window.setTimeout(reset, 1600);
      } catch {
        button.textContent = localization?.translate("actions.copy_from_address", "Copy from address bar") ?? "Copy from address bar";
        window.setTimeout(reset, 1800);
      }
    });
  }
};

const loadAsciiMath = () => {
  if (document.body.dataset.hasMath !== "true") {
    return;
  }

  const scriptUrl = document.querySelector('meta[name="x-asciimath-script"]')?.content;
  const inlineDelimiter = document.querySelector('meta[name="x-asciimath-inline"]')?.content ?? "%%";
  const blockDelimiter = document.querySelector('meta[name="x-asciimath-block"]')?.content ?? "%%%";

  if (!scriptUrl) {
    return;
  }

  window.MathJax = {
    loader: {
      load: ["input/asciimath", "output/chtml"],
    },
    asciimath: {
      delimiters: [
        [inlineDelimiter, inlineDelimiter],
        [blockDelimiter, blockDelimiter],
      ],
    },
    startup: {
      typeset: true,
    },
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  document.head.append(script);
};

const initPostViewSwitchers = () => {
  const switchers = document.querySelectorAll("[data-post-view]");
  for (const switcher of switchers) {
    const collection = switcher.closest(".section-panel")?.querySelector("[data-post-collection]");
    if (!collection) {
      continue;
    }

    const defaultView = switcher.dataset.defaultView ?? collection.dataset.view ?? "list";
    collection.dataset.view = defaultView;

    const buttons = switcher.querySelectorAll("[data-view-option]");
    const sync = (view) => {
      collection.dataset.view = view;
      for (const button of buttons) {
        button.dataset.active = String(button.dataset.viewOption === view);
      }
    };

    sync(defaultView);

    for (const button of buttons) {
      button.addEventListener("click", () => {
        sync(button.dataset.viewOption ?? defaultView);
      });
    }
  }
};

const initThemeManager = () => {
  const storageKey = "site-theme";
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const htmlElement = document.documentElement;

  const getStoredTheme = () => localStorage.getItem(storageKey);
  const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  
  const applyTheme = (theme) => {
    htmlElement.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
    
    // Update icons if any
    const moonIcon = document.querySelector(".theme-icon-moon");
    const sunIcon = document.querySelector(".theme-icon-sun");
    if (moonIcon && sunIcon) {
      if (theme === "dark") {
        moonIcon.classList.add("hidden");
        sunIcon.classList.remove("hidden");
      } else {
        moonIcon.classList.remove("hidden");
        sunIcon.classList.add("hidden");
      }
    }
  };

  const currentTheme = getStoredTheme() || getSystemTheme();
  applyTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const newTheme = htmlElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      
      // Animation effect
      themeToggle.style.transform = "scale(1.2) rotate(15deg)";
      setTimeout(() => {
        themeToggle.style.transform = "";
      }, 200);
    });
  }

  // Sync with system changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
};

const initNavToggle = () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  const shell = document.querySelector("[data-nav-shell]");
  const iconMenu = document.querySelector(".nav-icon-menu");
  const iconClose = document.querySelector(".nav-icon-close");

  if (!toggle || !menu || !shell) {
    return;
  }

  const toggleMenu = (force) => {
    const isOpen = typeof force === "boolean" ? force : menu.hidden;
    menu.hidden = !isOpen;
    shell.dataset.navOpen = String(isOpen);

    if (isOpen) {
      document.body.style.overflow = "hidden";
      iconMenu?.classList.add("hidden");
      iconClose?.classList.remove("hidden");
    } else {
      document.body.style.overflow = "";
      iconMenu?.classList.remove("hidden");
      iconClose?.classList.add("hidden");
    }
  };

  toggle.addEventListener("click", () => toggleMenu());

  // Close on link click
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => toggleMenu(false));
  });

  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      toggleMenu(false);
    }
  });

  // Sync with resize
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768 && !menu.hidden) {
      toggleMenu(false);
    }
  });
};

const initCommandPalette = (localization) => {
  const shell = document.querySelector("[data-command-palette]");
  if (!shell) {
    return;
  }

  const openButtons = document.querySelectorAll("[data-open-palette]");
  const closeButtons = document.querySelectorAll("[data-close-palette]");
  const input = shell.querySelector("[data-palette-input]");
  const results = shell.querySelector("[data-palette-results]");
  const indexUrl = shell.dataset.searchIndex;

  let loaded = false;
  let items = [];

  const loadIndex = async () => {
    if (loaded || !indexUrl) {
      return items;
    }

    const response = await fetch(indexUrl, { cache: "no-store" });
    items = response.ok ? await response.json() : [];
    loaded = true;
    return items;
  };

  const renderResults = async (query = "") => {
    const searchItems = await loadIndex();
    const normalizedQuery = query.trim().toLowerCase();

    let filtered = searchItems;
    if (normalizedQuery) {
      filtered = searchItems.filter((item) => {
        const haystack = [item.title, item.summary, ...(item.keywords ?? [])].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    results.innerHTML = "";

    if (!filtered.length) {
      const empty = document.createElement("li");
      empty.className = "palette-empty";
      empty.textContent = localization?.translate("palette.empty", "No matching result.") ?? "No matching result.";
      results.append(empty);
      return;
    }

    for (const item of filtered.slice(0, 8)) {
      const row = document.createElement("li");
      const link = document.createElement("a");
      link.className = "palette-result";
      link.href = item.url;
      const kind = localization?.translate(`kinds.${item.kind}`, item.kind) ?? item.kind;
      link.innerHTML = `
        <strong>${item.title}</strong>
        <span>${kind}</span>
        <small>${item.summary}</small>
      `;
      row.append(link);
      results.append(row);
    }
  };

  const openPalette = async () => {
    shell.hidden = false;
    document.body.dataset.paletteOpen = "true";
    await renderResults(input.value);
    input.focus();
    input.select();
  };

  const closePalette = () => {
    shell.hidden = true;
    document.body.dataset.paletteOpen = "false";
  };

  for (const button of openButtons) {
    button.addEventListener("click", openPalette);
  }

  for (const button of closeButtons) {
    button.addEventListener("click", closePalette);
  }

  input.addEventListener("input", () => {
    renderResults(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const firstResult = results.querySelector("a");
      if (firstResult) {
        window.location.href = firstResult.href;
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    const shortcutPressed = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (shortcutPressed) {
      event.preventDefault();
      if (shell.hidden) {
        openPalette();
      } else {
        closePalette();
      }
    }

    if (event.key === "Escape" && !shell.hidden) {
      closePalette();
    }
  });

  window.addEventListener("site:localechange", () => {
    if (!shell.hidden) {
      renderResults(input.value);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const localization = createLocalization();
  localization?.applyTranslations();
  initLocaleSwitcher(localization);
  enhanceCopyLink(localization);
  initPostViewSwitchers();
  initLocaleToggle(localization);
  initThemeManager();
  initNavToggle();
  initCommandPalette(localization);
  initCodeBlocks(localization);
  initGlowCards();
  initKnowledgeGraph(localization);
  loadAsciiMath();
});

const initCodeBlocks = (localization) => {
  const codeShells = document.querySelectorAll(".code-shell");
  codeShells.forEach((shell) => {
    const copyBtn = shell.querySelector(".code-shell-copy");
    const code = shell.querySelector("code");
    if (!copyBtn || !code) return;

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        
        // Visual feedback
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i data-lucide="check" style="color: var(--accent)"></i>';
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
          copyBtn.innerHTML = originalIcon;
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      } catch (err) {
        console.error("Failed to copy code:", err);
      }
    });
  });
};

const initGlowCards = () => {
  const cards = document.querySelectorAll(".glow-card, .resource-list li, .post-card, .project-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
};

const initKnowledgeGraph = async (localization) => {
  const container = document.querySelector("[data-knowledge-graph]");
  if (!container || !window.d3) return;

  const width = container.clientWidth;
  const height = 400;
  
  const response = await fetch("/assets/graph-data.json");
  if (!response.ok) return;
  const data = await response.json();

  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; cursor: grab;");

  const g = svg.append("g");

  svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.5, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-150))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05));

  const link = g.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke", "var(--border)")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);

  const node = g.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(data.nodes)
    .join("circle")
    .attr("r", d => d.kind === "project" ? 8 : 5)
    .attr("fill", d => {
      if (d.kind === "project") return "var(--accent)";
      if (d.kind === "post") return "var(--accent-secondary)";
      return "var(--muted)";
    })
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  node.append("title")
    .text(d => d.title);

  const label = g.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(data.nodes)
    .join("text")
    .attr("dy", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-family", "var(--font-code)")
    .attr("fill", "var(--text)")
    .style("pointer-events", "none")
    .text(d => d.title);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
      
    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  
  node.on("click", (event, d) => {
    if (d.url) window.location.href = d.url;
  });
};
