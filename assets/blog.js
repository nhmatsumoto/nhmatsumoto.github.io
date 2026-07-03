(() => {
  "use strict";

  const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
  const SEARCH_INDEX_URL = "/assets/search-index.json";

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage may be unavailable in private or embedded browsing contexts.
      }
    },
  };

  /* ---------------------------------------------------------------- theme */

  const currentTheme = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    storage.set("site-theme", theme);
    document.querySelectorAll(".theme-icon-moon").forEach((el) => el.classList.toggle("hidden", theme === "light"));
    document.querySelectorAll(".theme-icon-sun").forEach((el) => el.classList.toggle("hidden", theme !== "light"));
    renderMermaid();
  };

  const initTheme = () => {
    applyTheme(currentTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        applyTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    });
  };

  /* -------------------------------------------------------------- mermaid */

  let mermaidLoading = null;

  const loadMermaid = () => {
    if (window.mermaid) return Promise.resolve();
    if (!mermaidLoading) {
      mermaidLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = MERMAID_SRC;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return mermaidLoading;
  };

  const renderMermaid = () => {
    const nodes = document.querySelectorAll(".mermaid");
    if (!nodes.length) return;

    loadMermaid().then(async () => {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme() === "light" ? "neutral" : "dark",
        securityLevel: "strict",
      });

      for (const el of nodes) {
        if (!el.dataset.diagramSource) {
          el.dataset.diagramSource = el.textContent;
        }
        el.removeAttribute("data-processed");
        el.textContent = el.dataset.diagramSource;
        try {
          await window.mermaid.run({ nodes: [el] });
        } catch {
          el.dataset.mermaidError = "true";
        }
      }
    }).catch(() => {
      // Diagram sources stay readable as plain text if the library fails to load.
    });
  };

  /* ----------------------------------------------------------- nav drawer */

  const initNavDrawer = () => {
    const toggles = document.querySelectorAll("[data-nav-toggle]");
    const drawer = document.getElementById("mobile-drawer");
    if (!toggles.length || !drawer) return;

    const setOpen = (open) => {
      document.body.dataset.navOpen = open ? "true" : "false";
      drawer.setAttribute("aria-hidden", String(!open));
      document.querySelectorAll(".menu-icon-open").forEach((el) => el.classList.toggle("hidden", open));
      document.querySelectorAll(".menu-icon-close").forEach((el) => el.classList.toggle("hidden", !open));
      toggles.forEach((toggle) => {
        if (toggle.tagName === "BUTTON") toggle.setAttribute("aria-expanded", String(open));
      });
    };

    toggles.forEach((toggle) => toggle.addEventListener("click", () => {
      setOpen(document.body.dataset.navOpen !== "true");
    }));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.dataset.navOpen === "true") setOpen(false);
    });

    drawer.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024 && document.body.dataset.navOpen === "true") setOpen(false);
    });

    setOpen(false);
  };

  /* -------------------------------------------------------- navbar scroll */

  const initNavbarScroll = () => {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const update = () => navbar.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", update, { passive: true });
    update();
  };

  /* ---------------------------------------------------------- code blocks */

  const initCodeBlocks = () => {
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest(".code-shell-ln-toggle");
      if (!toggle) return;
      const shell = toggle.closest(".code-shell");
      if (shell) shell.classList.toggle("no-line-numbers");
    });

    document.addEventListener("click", async (event) => {
      const btn = event.target.closest(".code-shell-copy");
      if (!btn) return;

      const shell = btn.closest(".code-shell");
      const pre = shell?.querySelector("pre");
      if (!shell || !pre) return;

      try {
        await navigator.clipboard.writeText(pre.textContent);
        shell.classList.add("is-copied");
        const feedback = btn.querySelector(".copy-feedback");
        if (feedback) {
          if (!feedback.dataset.originalText) {
            feedback.dataset.originalText = feedback.textContent || "";
          }
          feedback.textContent = "Copiado!";
        }
        window.setTimeout(() => {
          shell.classList.remove("is-copied");
          if (feedback) feedback.textContent = feedback.dataset.originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  };

  /* --------------------------------------------------------- card effects */

  const initInteractiveGlow = () => {
    const updateCoords = (event) => {
      const card = event.currentTarget;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    };
    document.querySelectorAll(".resource-card, .project-card-premium, .post-card, .document-card").forEach((el) => {
      el.addEventListener("mousemove", updateCoords);
    });
  };

  /* ------------------------------------------------------------ analytics */

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

  /* --------------------------------------------------------------- search */

  const SEARCH_ICON = '<svg class="lucide lucide-search" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

  const CLOSE_ICON = '<svg class="lucide lucide-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  const KIND_LABELS = {
    post: "publicação",
    daily: "daily",
    project: "projeto",
    document: "documento",
    page: "página",
  };

  const normalizeText = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const initSearch = () => {
    const groups = document.querySelectorAll(".nav-actions .nav-group");
    if (!groups.length) return;

    groups.forEach((group) => {
      const mobile = group.classList.contains("nav-group-mobile");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-btn-icon nav-btn-search" + (mobile ? " nav-btn-search-mobile" : "");
      btn.setAttribute("aria-label", "Buscar no site");
      btn.dataset.searchToggle = "true";
      btn.innerHTML = SEARCH_ICON + (mobile ? "" : '<span class="search-key-hint" aria-hidden="true">Ctrl K</span>');
      group.insertBefore(btn, group.firstChild);
    });

    const overlay = document.createElement("div");
    overlay.className = "search-palette";
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="search-palette-backdrop" data-search-close></div>',
      '<div class="search-palette-dialog" role="dialog" aria-modal="true" aria-label="Busca">',
      '  <div class="search-palette-head">',
      '    <div class="search-palette-title-block"><h2>Buscar no site</h2></div>',
      '    <button class="search-palette-close" type="button" data-search-close aria-label="Fechar busca">',
      "      " + CLOSE_ICON,
      "    </button>",
      "  </div>",
      '  <div class="search-input-shell">',
      '    <span class="search-input-icon">' + SEARCH_ICON + "</span>",
      '    <input type="search" placeholder="Buscar publicações, projetos, documentos e notas" autocomplete="off" spellcheck="false" aria-label="Buscar">',
      "  </div>",
      '  <p class="search-palette-hint">Digite para filtrar. Setas navegam, Enter abre e Esc fecha.</p>',
      '  <ul class="search-results" role="listbox"></ul>',
      '  <p class="search-empty" hidden>Nenhum resultado encontrado.</p>',
      "</div>",
    ].join("\n");
    document.body.appendChild(overlay);

    const input = overlay.querySelector("input[type=search]");
    const list = overlay.querySelector(".search-results");
    const empty = overlay.querySelector(".search-empty");

    let index = null;
    let indexPromise = null;
    let activeIdx = -1;

    const loadIndex = () => {
      if (index) return Promise.resolve(index);
      if (!indexPromise) {
        indexPromise = fetch(SEARCH_INDEX_URL, { headers: { Accept: "application/json" } })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            index = (Array.isArray(data) ? data : []).map((item) => ({
              ...item,
              haystack: normalizeText(`${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`),
            }));
            return index;
          })
          .catch(() => {
            index = [];
            return index;
          });
      }
      return indexPromise;
    };

    const setOpen = (open) => {
      overlay.hidden = !open;
      document.body.dataset.searchOpen = open ? "true" : "false";
      if (open) {
        loadIndex().then(() => renderResults(input.value));
        input.focus();
        input.select();
      }
    };

    const renderResults = (query) => {
      const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
      let items;
      if (!tokens.length) {
        items = (index || []).slice(0, 8);
      } else {
        items = (index || []).filter((item) => tokens.every((token) => item.haystack.includes(token))).slice(0, 12);
      }

      activeIdx = items.length ? 0 : -1;
      empty.hidden = items.length > 0 || !tokens.length;
      list.innerHTML = items.map((item, i) => [
        `<li class="search-result${i === activeIdx ? " is-active" : ""}" role="option" aria-selected="${i === activeIdx}">`,
        `<a class="search-result-link" href="${item.url}">`,
        `<span class="search-result-kind">${KIND_LABELS[item.kind] || item.kind || ""}</span>`,
        `<span class="search-result-title">${item.title}</span>`,
        item.description ? `<span class="search-result-summary">${item.description}</span>` : "",
        "</a></li>",
      ].join("")).join("");
    };

    const moveActive = (delta) => {
      const rows = list.querySelectorAll(".search-result");
      if (!rows.length) return;
      activeIdx = (activeIdx + delta + rows.length) % rows.length;
      rows.forEach((row, i) => {
        row.classList.toggle("is-active", i === activeIdx);
        row.setAttribute("aria-selected", String(i === activeIdx));
      });
      rows[activeIdx].scrollIntoView({ block: "nearest" });
    };

    input.addEventListener("input", () => renderResults(input.value));

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === "Enter") {
        const active = list.querySelector(".search-result.is-active a");
        if (active) {
          event.preventDefault();
          window.location.href = active.getAttribute("href");
        }
      }
    });

    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-search-close]")) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-search-toggle]")) setOpen(true);
    });

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(overlay.hidden);
      } else if (event.key === "Escape" && !overlay.hidden) {
        setOpen(false);
      }
    });
  };

  /* ----------------------------------------------------------------- boot */

  const boot = () => {
    initAnalyticsHelpers();
    initTheme();
    initNavDrawer();
    initNavbarScroll();
    initCodeBlocks();
    initInteractiveGlow();
    initSearch();
    document.body.removeAttribute("data-sidebar-open");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
