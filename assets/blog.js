const enhanceCopyLink = () => {
  const buttons = document.querySelectorAll("[data-copy-link]");
  for (const button of buttons) {
    const originalLabel = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        button.textContent = "link copied";
        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1600);
      } catch {
        button.textContent = "copy from address bar";
        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1800);
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

    const defaultView = switcher.dataset.defaultView ?? "list";
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

const initCommandPalette = () => {
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
      empty.textContent = "No matching result.";
      results.append(empty);
      return;
    }

    for (const item of filtered.slice(0, 8)) {
      const row = document.createElement("li");
      const link = document.createElement("a");
      link.className = "palette-result";
      link.href = item.url;
      link.innerHTML = `
        <strong>${item.title}</strong>
        <span>${item.kind}</span>
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
};

document.addEventListener("DOMContentLoaded", () => {
  enhanceCopyLink();
  initPostViewSwitchers();
  initCommandPalette();
  loadAsciiMath();
});
