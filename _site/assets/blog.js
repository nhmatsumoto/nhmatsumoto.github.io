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
const createLocalization = () => {
const config = parseJsonScript("site-i18n");
if (!config) return null;
const supportedLocales = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
const aliases = config.aliases ?? {};
const strings = config.strings ?? {};
const defaultLocale = config.defaultLocale ?? document.body.dataset.defaultLocale ?? "pt-BR";
const storageKey = "site-locale";
const resolveLocale = (candidate) => {
if (!candidate) return null;
const raw = String(candidate).trim();
if (!raw) return null;
if (supportedLocales.includes(raw)) return raw;
const lowered = raw.toLowerCase();
const aliased = aliases[lowered];
if (aliased && supportedLocales.includes(aliased)) return aliased;
const base = lowered.split("-")[0];
const baseAlias = aliases[base];
if (baseAlias && supportedLocales.includes(baseAlias)) return baseAlias;
const supportedMatch = supportedLocales.find((locale) => locale.toLowerCase() === lowered);
if (supportedMatch) return supportedMatch;
return null;
};
const detectLocale = () => {
const stored = resolveLocale(window.localStorage.getItem(storageKey));
if (stored) return stored;
const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length
? navigator.languages
: [navigator.language].filter(Boolean);
for (const browserLocale of browserLocales) {
const resolved = resolveLocale(browserLocale);
if (resolved) return resolved;
}
return resolveLocale(defaultLocale) ?? "pt-BR";
};
let currentLocale = detectLocale();
const translate = (key, fallback = "") => {
const primary = resolvePath(strings[currentLocale], key);
if (typeof primary === "string") return primary;
const secondary = resolvePath(strings[defaultLocale], key);
if (typeof secondary === "string") return secondary;
return fallback;
};
const applyTranslations = () => {
document.documentElement.lang = currentLocale;
document.body.dataset.locale = currentLocale;
document.querySelectorAll("[data-i18n]").forEach(element => {
const key = element.dataset.i18n;
if (!element.dataset.i18nFallback) element.dataset.i18nFallback = element.textContent || "";
element.textContent = translate(key, element.dataset.i18nFallback);
});
document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
const key = element.dataset.i18nPlaceholder;
if (!element.dataset.i18nPlaceholderFallback) element.dataset.i18nPlaceholderFallback = element.getAttribute("placeholder") || "";
element.setAttribute("placeholder", translate(key, element.dataset.i18nPlaceholderFallback));
});
document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
const key = element.dataset.i18nAriaLabel;
if (!element.dataset.i18nAriaFallback) element.dataset.i18nAriaFallback = element.getAttribute("aria-label") || "";
element.setAttribute("aria-label", translate(key, element.dataset.i18nAriaFallback));
});
const shortFormatter = new Intl.DateTimeFormat(currentLocale, { day: "2-digit", month: "short", year: "numeric" });
const longFormatter = new Intl.DateTimeFormat(currentLocale, { day: "numeric", month: "long", year: "numeric" });
document.querySelectorAll("[data-localize-date]").forEach(el => {
const date = new Date(el.getAttribute("datetime"));
if (!isNaN(date)) el.textContent = (el.dataset.localizeDate === "short" ? shortFormatter : longFormatter).format(date);
});
const rtTemplate = translate("templates.reading_time", "{minutes} min read");
document.querySelectorAll("[data-reading-time]").forEach(el => {
el.textContent = formatTemplate(rtTemplate, { minutes: el.dataset.readingTime });
});
document.querySelectorAll("[data-status-key]").forEach(el => {
if (!el.dataset.i18nFallback) el.dataset.i18nFallback = el.textContent || "";
el.textContent = translate(el.dataset.statusKey, el.dataset.i18nFallback);
});
};
const setLocale = (locale) => {
currentLocale = resolveLocale(locale) ?? currentLocale;
window.localStorage.setItem(storageKey, currentLocale);
applyTranslations();
window.dispatchEvent(new CustomEvent("site:localechange", { detail: { locale: currentLocale } }));
};
return { translate, setLocale, applyTranslations, getLocale: () => currentLocale, getSupportedLocales: () => supportedLocales };
};
const initThemeManager = () => {
const html = document.documentElement;
const storageKey = "site-theme";
const getStored = () => localStorage.getItem(storageKey);
const getSystem = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
const updateThemeIcons = (theme) => {
document.querySelectorAll(".theme-icon-moon").forEach(el => el.classList.toggle("hidden", theme === "light"));
document.querySelectorAll(".theme-icon-sun").forEach(el => el.classList.toggle("hidden", theme === "dark"));
};
const setTheme = (theme, transition = true) => {
if (!transition) html.classList.add("no-transitions");
html.dataset.theme = theme;
localStorage.setItem(storageKey, theme);
updateThemeIcons(theme);
if (!transition) {
html.offsetHeight;
html.classList.remove("no-transitions");
}
};
setTheme(getStored() || getSystem(), false);
const toggle = document.querySelector("[data-theme-toggle]");
if (toggle) {
toggle.addEventListener("click", () => {
const next = html.dataset.theme === "dark" ? "light" : "dark";
setTheme(next);
toggle.animate([
{ transform: "rotate(0) scale(1)" },
{ transform: "rotate(15deg) scale(1.2)", offset: 0.5 },
{ transform: "rotate(0) scale(1)" }
], { duration: 300, easing: "ease-out" });
});
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
if (!getStored()) setTheme(e.matches ? "dark" : "light");
});
};
const initNavToggle = () => {
const toggles = document.querySelectorAll("[data-nav-toggle]");
const menu = document.querySelector("[data-nav-menu]");
const shell = document.querySelector("[data-nav-shell]");
if (!menu || !shell) return;
const setNavOpen = (open) => {
shell.dataset.navOpen = String(open);
menu.hidden = !open;
document.body.style.overflow = open ? "hidden" : "";
};
toggles.forEach(t => t.addEventListener("click", () => setNavOpen(menu.hidden)));
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setNavOpen(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNavOpen(false); });
window.addEventListener("resize", () => { if (window.innerWidth >= 768) setNavOpen(false); });
};
const initLocaleToggle = (loc) => {
if (!loc) return;
const btns = document.querySelectorAll("[data-locale-toggle]");
if (!btns.length) return;
const supported = loc.getSupportedLocales();
if (supported.length < 2) return;
const updateLabels = () => {
const current = loc.getLocale();
const short = current.split("-")[0].toUpperCase();
document.querySelectorAll("[data-locale-label]").forEach(el => el.textContent = short);
};
updateLabels();
btns.forEach(btn => btn.addEventListener("click", () => {
const current = loc.getLocale();
const idx = supported.indexOf(current);
const next = supported[(idx + 1) % supported.length];
loc.setLocale(next);
loc.applyTranslations();
updateLabels();
btn.animate([
{ transform: "scale(1)" },
{ transform: "scale(1.15)", offset: 0.4 },
{ transform: "scale(1)" }
], { duration: 250, easing: "ease-out" });
}));
};
const initCommandPalette = (loc) => {
const palette = document.querySelector("[data-command-palette]");
const input = palette?.querySelector("[data-palette-input]");
const results = palette?.querySelector("[data-palette-results]");
if (!palette || !input || !results) return;
let index = null;
const loadIndex = async () => {
if (index) return index;
const res = await fetch(palette.dataset.searchIndex);
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
<span class="result-kind">${loc?.translate(`kinds.${it.kind}`, it.kind) ?? it.kind}</span>
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
document.querySelectorAll(".resource-card, .nav-glass, .palette-shell").forEach(el => {
el.addEventListener("mousemove", updateCoords);
});
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
metrics: panel.querySelector("[data-panel-metrics]"),
link: panel.querySelector("[data-panel-link]"),
metaRow: panel.querySelector("[data-panel-meta-row]")
};
const setOpen = (open) => {
panel.dataset.open = String(open);
panel.setAttribute("aria-hidden", String(!open));
if (open) {
document.body.style.overflow = "hidden";
setTimeout(() => content.dataset.revealed = "true", 100);
} else {
document.body.style.overflow = "";
content.dataset.revealed = "false";
}
};
const show = (data) => {
if (!data) return;
content.dataset.revealed = "false";
if (elements.role) {
const kind = data.kind || "knowledge";
elements.role.textContent = loc?.translate(`kinds.${kind}`, kind) || kind;
elements.role.dataset.i18n = `kinds.${kind}`;
}
if (elements.name) elements.name.textContent = data.name || data.title || "";
if (elements.headline) elements.headline.textContent = data.headline || "";
if (elements.summary) {
if (data.body_html) {
elements.summary.innerHTML = data.body_html;
} else {
elements.summary.textContent = data.summary || "";
}
}
if (elements.stack) {
elements.stack.innerHTML = (data.stack || []).map(s => `<span class="stack-chip">${s}</span>`).join("");
}
if (elements.metaRow) {
const meta = [];
if (data.published_dt) {
const date = new Date(data.published_dt);
meta.push(`<span>${new Intl.DateTimeFormat(loc?.getLocale() || "pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date)}</span>`);
}
if (data.reading_time) meta.push(`<span>${data.reading_time} min</span>`);
if (data.category) meta.push(`<span>${data.category}</span>`);
elements.metaRow.innerHTML = meta.join(" &middot; ");
}
if (elements.link) {
elements.link.href = data.resolved_url || data.url || "#";
const actionKey = data.kind === "project" ? "actions.view_project" : "actions.read_article";
elements.link.innerHTML = `<i data-lucide="eye"></i> ${loc?.translate(actionKey, "Ver")} <i data-lucide="arrow-right"></i>`;
if (typeof lucide !== 'undefined') lucide.createIcons();
}
if (window.mermaid) {
try {
window.mermaid.init(undefined, panel.querySelectorAll(".mermaid"));
} catch (err) {
console.error("Mermaid error:", err);
}
}
if (window.MathJax && window.MathJax.typesetPromise) {
window.MathJax.typesetPromise([panel]).catch(err => console.error("MathJax error:", err));
}
setOpen(true);
};
window.showIntelligencePanel = show;
window.hideIntelligencePanel = () => setOpen(false);
panel.querySelectorAll("[data-panel-close]").forEach(el => {
el.addEventListener("click", () => setOpen(false));
});
document.addEventListener("keydown", (e) => {
if (e.key === "Escape") setOpen(false);
});
if (typeof lucide !== 'undefined') lucide.createIcons();
};
const initSidebarToggle = () => {
const toggles = document.querySelectorAll("[data-sidebar-toggle]");
const setOpen = (open) => {
document.body.dataset.sidebarOpen = String(open);
document.body.style.overflow = open ? "hidden" : "";
};
toggles.forEach(t => t.addEventListener("click", () => {
const isOpen = document.body.dataset.sidebarOpen === "true";
setOpen(!isOpen);
}));
document.addEventListener("keydown", (e) => {
if (e.key === "Escape") setOpen(false);
});
};
document.addEventListener("DOMContentLoaded", () => {
const loc = createLocalization();
loc?.applyTranslations();
initThemeManager();
initNavToggle();
initLocaleToggle(loc);
initCommandPalette(loc);
initCodeBlocks();
initInteractiveGlow();
initIntelligencePanel(loc);
initSidebarToggle();
initVisualizationToggle();
if (window.initKnowledgeGraph) window.initKnowledgeGraph();
});
const initVisualizationToggle = () => {
const navBtn = document.querySelector("[data-vis-toggle]");
if (!navBtn) return;
navBtn.addEventListener("click", () => {
if (window.projectMap) {
const currentMode = window.projectMap.layoutMode;
const nextMode = currentMode === "atomo" ? "arvore" : "atomo";
window.projectMap.setLayout(nextMode);
return;
}
const btvTrigger = document.getElementById("btv-trigger");
if (btvTrigger) {
btvTrigger.click();
}
});
const observer = new MutationObserver(() => {
const btvTrigger = document.getElementById("btv-trigger");
if (btvTrigger && btvTrigger.style.display !== 'none') {
btvTrigger.style.display = 'none';
observer.disconnect();
}
});
observer.observe(document.body, { childList: true, subtree: true });
};