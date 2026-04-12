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
try {
root.querySelectorAll(".mermaid[data-processed]").forEach(el => {
el.removeAttribute("data-processed");
el.innerHTML = el.getAttribute("data-original-code") || el.innerHTML;
});
root.querySelectorAll(".mermaid").forEach(el => {
if (!el.getAttribute("data-original-code")) {
el.setAttribute("data-original-code", el.innerHTML);
}
});
window.mermaid.init(undefined, root.querySelectorAll(".mermaid"));
} catch (err) {
console.error("Mermaid error:", err);
}
}
if (window.MathJax && window.MathJax.typesetPromise) {
window.MathJax.typesetPromise([root]).catch(err => console.error("MathJax error:", err));
}
if (typeof lucide !== "undefined") {
lucide.createIcons();
}
};
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
const short = locale.split("-")[0].toUpperCase();
document.querySelectorAll("[data-locale-label]").forEach(el => el.textContent = short);
};
useStore.subscribe((state, prevState) => {
if (state.locale !== prevState.locale) {
applyTranslations(state.locale);
}
});
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
const initPageContentLocalization = () => {
const data = parseJsonScript("page-content-data");
if (!data) return;
const elements = {
title: document.querySelector("[data-page-title]"),
summary: document.querySelector("[data-page-summary]"),
body: document.querySelector("[data-page-body]"),
breadcrumb: document.querySelector(".breadcrumbs [aria-current='page']"),
description: document.querySelector('meta[name="description"]')
};
const originalDocumentTitle = document.title;
const siteTitle = originalDocumentTitle.includes(" | ")
? originalDocumentTitle.split(" | ").slice(1).join(" | ")
: "";
const applyPageContent = (locale) => {
const title = resolveLocalizedField(data, "title", locale, elements.title?.dataset.pageFallback || "");
const summary = resolveLocalizedField(data, "summary", locale, elements.summary?.dataset.pageFallback || "");
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
const updatePanelUI = (data) => {
if (!data) return;
const locale = useStore.getState().locale;
const getName = (d) => resolveLocalizedField(d, ["name", "title"], locale, d.name || d.title || "");
const getHeadline = (d) => resolveLocalizedField(d, "headline", locale, d.headline || "");
const getSummary = (d) => resolveLocalizedField(d, "summary", locale, d.summary || getHeadline(d));
const getBody = (d) => resolveLocalizedField(d, "body_html", locale, d.body_html || getSummary(d));
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
setTimeout(() => syncRichContent(panel), 50);
};
useStore.subscribe((state, prevState) => {
if (state.panelOpen !== prevState.panelOpen) {
panel.dataset.open = String(state.panelOpen);
panel.setAttribute("aria-hidden", String(!state.panelOpen));
if (content) content.dataset.revealed = String(state.panelOpen);
if (state.panelOpen && state.panelData) {
updatePanelUI(state.panelData);
}
}
if (state.panelData !== prevState.panelData && state.panelData && state.panelOpen) {
updatePanelUI(state.panelData);
}
});
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
const localizeEntry = (item, locale) => ({
title: resolveLocalizedField(item, "title", locale, item.title || ""),
summary: resolveLocalizedField(item, ["summary", "headline"], locale, item.summary || "")
});
const searchableText = (item, locale) => {
const localized = localizeEntry(item, locale);
const values = [
localized.title,
localized.summary,
item.title,
item.summary,
...(item.keywords || [])
];
Object.entries(item).forEach(([key, value]) => {
if (/^(title|summary|headline)_/.test(key) && typeof value === "string") {
values.push(value);
}
});
return values.filter(Boolean).join(" ").toLowerCase();
};
const search = async (q) => {
const items = await loadIndex();
const locale = useStore.getState().locale;
const query = q.trim().toLowerCase();
const filtered = query
? items.filter(it => searchableText(it, locale).includes(query))
: items;
results.innerHTML = filtered.length
? filtered.slice(0, 10).map(it => {
const localized = localizeEntry(it, locale);
return `
<li>
<a href="${it.url}" class="palette-result">
<span class="result-kind">${loc?.translate(`kinds.${it.kind}`, it.kind)}</span>
<div class="result-info">
<strong class="result-title">${localized.title}</strong>
<small class="result-summary">${localized.summary}</small>
</div>
</a>
</li>`;
}).join("")
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
useStore.subscribe((state, prevState) => {
if (state.locale !== prevState.locale && !palette.hidden) {
search(input.value);
}
});
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
document.addEventListener("DOMContentLoaded", () => {
const loc = initLocalization();
initPageContentLocalization();
initThemeManager();
initLocaleToggle(loc);
initCommandPalette(loc);
initIntelligencePanel(loc);
initCodeBlocks();
initInteractiveGlow();
document.body.removeAttribute('data-sidebar-open');
if (typeof lucide !== 'undefined') lucide.createIcons();
if (typeof window.initKnowledgeGraph === 'function') window.initKnowledgeGraph(loc);
});