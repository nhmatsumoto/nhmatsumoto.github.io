(function () {
"use strict";
const parseJsonScript = (id) => {
const node = document.getElementById(id);
if (!node) return null;
try {
return JSON.parse(node.textContent || "{}");
} catch (error) {
console.error("Invalid translation payload", error);
return null;
}
};
const payload = parseJsonScript("single-page-translations") || {};
const languages = Array.isArray(payload.languages) && payload.languages.length
? payload.languages
: ["pt-BR", "en", "ja"];
const defaultLanguage = payload.defaultLanguage || "pt-BR";
const contents = payload.contents || {};
const ui = payload.ui || {};
const getStoredLanguage = () => {
const saved = localStorage.getItem("single-page-language");
return languages.includes(saved) ? saved : defaultLanguage;
};
const setStoredLanguage = (language) => {
localStorage.setItem("single-page-language", language);
};
const translateUi = (key, language) => {
return ui[language]?.[key] || ui[defaultLanguage]?.[key] || key;
};
const translationFor = (contentKey, language) => {
return contents[contentKey]?.translations?.[language]
|| contents[contentKey]?.translations?.[defaultLanguage]
|| null;
};
const refreshRichContent = (root) => {
if (window.lucide) {
window.lucide.createIcons();
}
root.querySelectorAll(".single-page-detail[open]").forEach((detail) => {
detail.scrollHeight;
});
};
const applyLanguage = (language) => {
const nextLanguage = languages.includes(language) ? language : defaultLanguage;
document.documentElement.lang = nextLanguage;
document.body.dataset.language = nextLanguage;
document.querySelectorAll("[data-ui-key]").forEach((element) => {
element.textContent = translateUi(element.dataset.uiKey, nextLanguage);
});
document.querySelectorAll("[data-content-key][data-content-field]").forEach((element) => {
const data = translationFor(element.dataset.contentKey, nextLanguage);
if (!data) return;
const field = element.dataset.contentField;
if (field === "body") {
element.innerHTML = data.body_html || "";
} else {
element.textContent = data[field] || "";
}
});
document.querySelectorAll("[data-language-label]").forEach((element) => {
element.textContent = nextLanguage.toUpperCase();
});
document.querySelectorAll("[data-language-option]").forEach((element) => {
element.toggleAttribute("aria-current", element.dataset.languageOption === nextLanguage);
});
setStoredLanguage(nextLanguage);
refreshRichContent(document);
};
const setTheme = (theme) => {
const nextTheme = theme === "light" ? "light" : "dark";
document.documentElement.dataset.theme = nextTheme;
localStorage.setItem("single-page-theme", nextTheme);
document.querySelectorAll(".theme-icon-moon").forEach((icon) => {
icon.classList.toggle("hidden", nextTheme === "light");
});
document.querySelectorAll(".theme-icon-sun").forEach((icon) => {
icon.classList.toggle("hidden", nextTheme !== "light");
});
};
const sectionFromHash = () => {
const id = decodeURIComponent(window.location.hash || "").replace(/^#/, "");
return id ? document.getElementById(id) : null;
};
const setActiveSection = (sectionId) => {
document.querySelectorAll("[data-nav-section]").forEach((link) => {
const active = link.dataset.navSection === sectionId;
link.classList.toggle("is-active", active);
if (active) {
link.setAttribute("aria-current", "page");
} else {
link.removeAttribute("aria-current");
}
});
};
const openDetailForHash = () => {
const target = sectionFromHash();
if (!target) return;
if (target.matches(".single-page-detail")) {
target.open = true;
}
};
const scrollToTarget = (target, updateHash) => {
if (!target) return;
if (target.matches(".single-page-detail")) {
target.open = true;
}
target.scrollIntoView({ behavior: "smooth", block: "start" });
target.focus({ preventScroll: true });
if (updateHash) {
history.pushState(null, "", `#${target.id}`);
}
};
const initNavigation = () => {
document.addEventListener("click", (event) => {
const navToggle = event.target.closest("[data-nav-toggle]");
if (navToggle) {
const drawer = document.getElementById("mobile-drawer");
const button = document.querySelector(".navbar-toggle");
const isOpen = drawer?.getAttribute("aria-hidden") === "false";
drawer?.setAttribute("aria-hidden", isOpen ? "true" : "false");
button?.setAttribute("aria-expanded", isOpen ? "false" : "true");
document.querySelectorAll(".menu-icon-open").forEach((icon) => icon.classList.toggle("hidden", !isOpen));
document.querySelectorAll(".menu-icon-close").forEach((icon) => icon.classList.toggle("hidden", isOpen));
return;
}
const hashLink = event.target.closest('a[href^="#"]');
if (!hashLink) return;
const id = decodeURIComponent(hashLink.getAttribute("href")).replace(/^#/, "");
const target = document.getElementById(id);
if (!target) return;
event.preventDefault();
scrollToTarget(target, true);
document.getElementById("mobile-drawer")?.setAttribute("aria-hidden", "true");
document.querySelector(".navbar-toggle")?.setAttribute("aria-expanded", "false");
});
const observer = new IntersectionObserver((entries) => {
const visible = entries
.filter((entry) => entry.isIntersecting)
.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
if (visible?.target?.dataset?.section) {
setActiveSection(visible.target.dataset.section);
}
}, { rootMargin: "-25% 0px -60% 0px", threshold: [0.1, 0.25, 0.5] });
document.querySelectorAll("[data-section]").forEach((section) => observer.observe(section));
window.addEventListener("hashchange", openDetailForHash);
openDetailForHash();
};
const initLanguageControls = () => {
document.addEventListener("click", (event) => {
const option = event.target.closest("[data-language-option]");
if (option) {
applyLanguage(option.dataset.languageOption);
return;
}
const cycle = event.target.closest("[data-language-cycle]");
if (!cycle) return;
const current = getStoredLanguage();
const index = languages.indexOf(current);
applyLanguage(languages[(index + 1) % languages.length] || defaultLanguage);
});
applyLanguage(getStoredLanguage());
};
const initTheme = () => {
setTheme(localStorage.getItem("single-page-theme") || document.documentElement.dataset.theme || "dark");
document.addEventListener("click", (event) => {
if (!event.target.closest("[data-theme-toggle]")) return;
setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
};
document.addEventListener("DOMContentLoaded", () => {
initTheme();
initLanguageControls();
initNavigation();
refreshRichContent(document);
});
}());