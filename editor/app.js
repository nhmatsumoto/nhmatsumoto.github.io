const SECTION_META = {
  posts: {
    title: "Publicacoes",
    kicker: "posts",
    copy: "Escrita editorial com preview de artigo, tags, badges e idiomas.",
    newLabel: "Novo post",
    empty: "Nenhum post encontrado.",
    previewTitle: "Preview do post",
    previewCopy: "Renderizacao local da publicacao atual.",
  },
  projects: {
    title: "Projetos",
    kicker: "projects",
    copy: "Projetos como ativos de longo prazo, com narrativa, stack, roadmap e links.",
    newLabel: "Novo projeto",
    empty: "Nenhum projeto encontrado.",
    previewTitle: "Preview do projeto",
    previewCopy: "Visualizacao da pagina de projeto com o mesmo parser do site.",
  },
  documents: {
    title: "Documentos",
    kicker: "documents",
    copy: "Documentos tecnicos com versao, categoria, arquivo fonte e localizacao.",
    newLabel: "Novo documento",
    empty: "Nenhum documento encontrado.",
    previewTitle: "Preview do documento",
    previewCopy: "Renderizacao local do documento tecnico atual.",
  },
  site: {
    title: "Blog",
    kicker: "site",
    copy: "Configuracao geral do site, home e paginas fixas.",
    newLabel: "Novo",
    empty: "Sem lista para esta area.",
    previewTitle: "Resumo do blog",
    previewCopy: "Visao geral do workspace editorial.",
  },
};

const MARKDOWN_ACTIONS = [
  { key: "h1", label: "H1", title: "Titulo 1" },
  { key: "h2", label: "H2", title: "Titulo 2" },
  { key: "bold", label: "B", title: "Negrito" },
  { key: "italic", label: "I", title: "Italico" },
  { key: "link", label: "Link", title: "Link" },
  { key: "quote", label: "Quote", title: "Bloco de citacao" },
  { key: "code", label: "`</>`", title: "Codigo inline" },
  { key: "codeblock", label: "```", title: "Bloco de codigo" },
  { key: "ul", label: "Lista", title: "Lista com marcadores" },
  { key: "ol", label: "1.", title: "Lista numerada" },
  { key: "table", label: "Tabela", title: "Tabela Markdown" },
  { key: "image", label: "Img", title: "Imagem" },
  { key: "mermaid", label: "Mermaid", title: "Bloco Mermaid" },
  { key: "hr", label: "Linha", title: "Separador" },
];

const state = {
  site: {},
  collections: {
    posts: [],
    projects: [],
    documents: [],
  },
  current: {
    posts: null,
    projects: null,
    documents: null,
  },
  locales: {
    default: "pt-BR",
    supported: ["pt-BR", "en-US", "ja-JP"],
    names: {},
  },
  storage: null,
  activeSection: "posts",
  activeLocale: "pt-BR",
  search: "",
  slugTouched: {
    posts: false,
    projects: false,
    documents: false,
  },
  previewTimer: null,
};

const siteForm = document.querySelector("#site-form");
const postForm = document.querySelector("#post-form");
const projectForm = document.querySelector("#project-form");
const documentForm = document.querySelector("#document-form");
const forms = {
  site: siteForm,
  posts: postForm,
  projects: projectForm,
  documents: documentForm,
};

const panels = {
  site: document.querySelector("#site-panel"),
  posts: document.querySelector("#post-panel"),
  projects: document.querySelector("#project-panel"),
  documents: document.querySelector("#document-panel"),
};

const contentList = document.querySelector("#content-list");
const notice = document.querySelector("#notice");
const preview = document.querySelector("#preview");
const previewTitle = document.querySelector("#preview-title");
const previewCopy = document.querySelector("#preview-copy");
const editorTitle = document.querySelector("#editor-title");
const editorKicker = document.querySelector("#editor-kicker");
const collectionTitle = document.querySelector("#collection-title");
const collectionKicker = document.querySelector("#collection-kicker");
const collectionCopy = document.querySelector("#collection-copy");
const listSummary = document.querySelector("#list-summary");
const searchItems = document.querySelector("#search-items");
const searchField = document.querySelector("#search-field");
const saveSiteButton = document.querySelector("#save-site");
const saveCurrentButton = document.querySelector("#save-current");
const previewCurrentButton = document.querySelector("#preview-current");
const deleteCurrentButton = document.querySelector("#delete-current");
const buildSiteButton = document.querySelector("#build-site");
const newEntryButton = document.querySelector("#new-entry");
const previewLocale = document.querySelector("#preview-locale");
const previewField = document.querySelector("#preview-field");
const gitStatus = document.querySelector("#git-status");
const storageStatus = document.querySelector("#storage-status");
const storagePill = document.querySelector("#storage-pill");
const countsSummary = document.querySelector("#counts-summary");
const localeSummary = document.querySelector("#locale-summary");
const commitMessage = document.querySelector("#commit-message");
const pushAfterCommit = document.querySelector("#push-after-commit");
const sectionsLink = document.querySelector("#sections-link");
const importPostsButton = document.querySelector("#import-posts");
const exportPostsButton = document.querySelector("#export-posts");
const documentSourceHint = document.querySelector("#document-source-hint");
const sectionButtons = Array.from(document.querySelectorAll("[data-section-switch]"));

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const contentType = response.headers.get("Content-Type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(payload.error ?? "Falha na requisicao.");
  }
  return payload;
};

const setNotice = (message, tone = "info") => {
  notice.textContent = message;
  notice.dataset.tone = tone;
};

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const formToObject = (form) => {
  const data = new FormData(form);
  const result = {};
  for (const [key, value] of data.entries()) {
    result[key] = value;
  }
  return result;
};

const activeCollection = () => state.collections[state.activeSection] || [];

const itemKey = (section, item) => (section === "posts" ? item.id : item.slug);

const activeForm = () => forms[state.activeSection];

const persistedItemExists = (section, value) =>
  (state.collections[section] || []).some((item) => itemKey(section, item) === value);

const currentPersistedKey = () => {
  if (state.activeSection === "site") {
    return "";
  }
  const form = activeForm();
  const fieldName = state.activeSection === "posts" ? "id" : "slug";
  return form.elements.namedItem(fieldName).value.trim();
};

const isCurrentPersisted = () => {
  if (state.activeSection === "site") {
    return false;
  }
  const key = currentPersistedKey();
  return key ? persistedItemExists(state.activeSection, key) : false;
};

const formatDateLabel = (value) => {
  const text = String(value || "").trim();
  return text ? text.replace("T", " ").slice(0, 16) : "sem data";
};

const localeBadges = (item) =>
  (item.available_locales || [])
    .map((locale) => locale.split("-")[0].toUpperCase())
    .join(" · ");

const itemDisplayTitle = (section, item) => {
  if (section === "projects") {
    return item.name || "Sem nome";
  }
  return item.title || "Sem titulo";
};

const itemDisplaySummary = (section, item) => {
  if (section === "projects") {
    return item.summary || item.headline || "Sem resumo";
  }
  return item.summary || "Sem resumo";
};

const searchTextForItem = (section, item) => {
  const translations = Object.values(item.translations || {})
    .map((entry) => Object.values(entry).flat().join(" "))
    .join(" ");
  const values = [
    itemDisplayTitle(section, item),
    itemDisplaySummary(section, item),
    item.category || "",
    item.status || "",
    item.version || "",
    (item.tags || []).join(" "),
    (item.badges || []).join(" "),
    (item.stack || []).join(" "),
    translations,
  ];
  return values.join(" ").toLowerCase();
};

const renderGitStatus = (git) => {
  const scoped = git.scoped.length ? git.scoped.join("\n") : "Sem mudancas do blog no momento.";
  const full = git.full.length ? git.full.join("\n") : "Worktree limpo.";
  gitStatus.textContent = `Escopo do blog:\n${scoped}\n\nRepositorio inteiro:\n${full}`;
};

const renderStorageStatus = (storage) => {
  state.storage = storage;
  const mode = storage?.mode === "postgresql" ? "PostgreSQL" : "TOML";
  const availability = storage?.available ? "conectado" : "fallback";
  storageStatus.dataset.mode = storage?.mode || "toml";
  storageStatus.textContent = `${mode} · ${availability}\n${storage?.message || ""}`;
  storagePill.textContent = `${mode} · ${availability}`;
  importPostsButton.disabled = !storage?.available;
  exportPostsButton.disabled = !storage?.available;
};

const renderCountsSummary = () => {
  const posts = state.collections.posts.length;
  const projects = state.collections.projects.length;
  const documents = state.collections.documents.length;
  countsSummary.textContent = `${posts} posts · ${projects} projetos · ${documents} docs`;
};

const syncLocaleOptions = () => {
  const supported = state.locales.supported?.length ? state.locales.supported : ["pt-BR", "en-US", "ja-JP"];
  if (!supported.includes(state.activeLocale)) {
    state.activeLocale = supported[0];
  }

  previewLocale.innerHTML = "";
  const labels = { "pt-BR": "PT", "en-US": "EN", "ja-JP": "JA" };
  for (const locale of supported) {
    const option = document.createElement("option");
    option.value = locale;
    option.textContent = labels[locale] || locale;
    previewLocale.append(option);
  }
  previewLocale.value = state.activeLocale;
  localeSummary.textContent = supported.map((locale) => labels[locale] || locale).join(" · ");
};

const syncLocaleTabs = () => {
  document.querySelectorAll("[data-locale-group]").forEach((group) => {
    const buttons = Array.from(group.querySelectorAll("[data-locale-tab]"));
    const panels = Array.from(group.querySelectorAll("[data-locale-panel]"));
    buttons.forEach((button) => {
      const active = button.dataset.localeTab === state.activeLocale;
      button.dataset.active = String(active);
      button.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.localePanel !== state.activeLocale;
    });
  });
};

const setFieldValue = (form, name, value) => {
  const field = form.elements.namedItem(name);
  if (!field) {
    return;
  }
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }
  if (Array.isArray(value)) {
    field.value = field.tagName === "TEXTAREA" ? value.join("\n") : value.join(", ");
    return;
  }
  field.value = value ?? "";
};

const fillSiteForm = (site) => {
  Object.entries(site).forEach(([key, value]) => setFieldValue(siteForm, key, value));
};

const fillPostForm = (post) => {
  Array.from(postForm.elements).forEach((element) => {
    if (element.name) {
      setFieldValue(postForm, element.name, post[element.name]);
    }
  });
};

const fillProjectForm = (project) => {
  Array.from(projectForm.elements).forEach((element) => {
    if (element.name) {
      setFieldValue(projectForm, element.name, project[element.name]);
    }
  });
};

const fillDocumentForm = (documentData) => {
  Array.from(documentForm.elements).forEach((element) => {
    if (element.name) {
      setFieldValue(documentForm, element.name, documentData[element.name]);
    }
  });
  updateDocumentSourceHint();
};

const updateDocumentSourceHint = () => {
  const sourcePath = documentForm.elements.namedItem("body_source_path").value.trim();
  documentSourceHint.textContent = sourcePath
    ? `O corpo PT sera escrito em ${sourcePath}. Os demais idiomas continuam no TOML.`
    : "Quando o caminho acima for preenchido, o corpo PT sera salvo no arquivo Markdown indicado.";
};

const readPostForm = () => {
  const base = formToObject(postForm);
  return {
    ...base,
    featured: postForm.elements.namedItem("featured").checked,
    has_asciimath: postForm.elements.namedItem("has_asciimath").checked,
  };
};

const readProjectForm = () => {
  const base = formToObject(projectForm);
  return {
    ...base,
    featured: projectForm.elements.namedItem("featured").checked,
  };
};

const readDocumentForm = () => {
  const base = formToObject(documentForm);
  return {
    ...base,
    agent_generated_tag: documentForm.elements.namedItem("agent_generated_tag").checked,
  };
};

const currentEditorTitle = () => {
  if (state.activeSection === "site") {
    return "Configuracao do blog";
  }

  const form = activeForm();
  const titleField =
    state.activeSection === "projects"
      ? form.elements.namedItem("name")
      : form.elements.namedItem("title");

  const primary = titleField?.value.trim();
  if (primary) {
    return primary;
  }
  return SECTION_META[state.activeSection].newLabel;
};

const renderPreviewEmpty = (message) => {
  preview.innerHTML = `<p class="empty-preview">${message}</p>`;
};

const renderSitePreview = () => {
  previewTitle.textContent = SECTION_META.site.previewTitle;
  previewCopy.textContent = SECTION_META.site.previewCopy;
  preview.innerHTML = `
    <article class="preview-article preview-article-site">
      <header class="preview-header">
        <p class="section-kicker">workspace</p>
        <h1>${state.site.title || "Meu Blog"}</h1>
        <p class="post-summary">${state.site.headline || "Sem headline configurada."}</p>
        <div class="preview-meta-row">
          <span class="preview-meta-chip">${state.collections.posts.length} posts</span>
          <span class="preview-meta-chip">${state.collections.projects.length} projetos</span>
          <span class="preview-meta-chip">${state.collections.documents.length} documentos</span>
        </div>
      </header>
      <div class="post-body">
        <p>${state.site.description || "Descricao nao configurada."}</p>
        <p>${state.site.home_intro || "A home ainda nao possui introducao personalizada."}</p>
      </div>
    </article>
  `;
};

const applyStatePayload = (payload) => {
  if (payload.site) {
    state.site = payload.site;
    fillSiteForm(payload.site);
  }
  if (payload.posts) {
    state.collections.posts = payload.posts;
  }
  if (payload.projects) {
    state.collections.projects = payload.projects;
  }
  if (payload.documents) {
    state.collections.documents = payload.documents;
  }
  if (payload.locales) {
    state.locales = payload.locales;
  }
  if (payload.storage) {
    renderStorageStatus(payload.storage);
  }
  if (payload.git) {
    renderGitStatus(payload.git);
  }
  renderCountsSummary();
  syncLocaleOptions();
  syncLocaleTabs();
  renderCollection();
};

const renderCollection = () => {
  const meta = SECTION_META[state.activeSection];
  collectionTitle.textContent = meta.title;
  collectionKicker.textContent = meta.kicker;
  collectionCopy.textContent = meta.copy;

  sectionButtons.forEach((button) => {
    button.dataset.active = String(button.dataset.sectionSwitch === state.activeSection);
  });

  contentList.innerHTML = "";

  if (state.activeSection === "site") {
    searchField.hidden = true;
    newEntryButton.hidden = true;
    listSummary.textContent = meta.empty;
    const item = document.createElement("li");
    item.className = "list-empty";
    item.textContent = "Ajuste a configuracao geral do blog no formulario principal.";
    contentList.append(item);
    return;
  }

  searchField.hidden = false;
  newEntryButton.hidden = false;
  newEntryButton.textContent = meta.newLabel;

  const filter = state.search.trim().toLowerCase();
  const items = activeCollection().filter((item) => !filter || searchTextForItem(state.activeSection, item).includes(filter));
  listSummary.textContent = `${items.length} resultado(s)`;

  if (!items.length) {
    const item = document.createElement("li");
    item.className = "list-empty";
    item.textContent = meta.empty;
    contentList.append(item);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "content-card";
    button.dataset.active = String(itemKey(state.activeSection, state.current[state.activeSection] || {}) === itemKey(state.activeSection, item));

    const title = document.createElement("strong");
    title.textContent = itemDisplayTitle(state.activeSection, item);

    const summary = document.createElement("p");
    summary.textContent = itemDisplaySummary(state.activeSection, item);

    const metaRow = document.createElement("div");
    metaRow.className = "card-meta";

    const appendChip = (text, tone = "default") => {
      if (!text) {
        return;
      }
      const chip = document.createElement("span");
      chip.className = "meta-chip";
      chip.dataset.tone = tone;
      chip.textContent = text;
      metaRow.append(chip);
    };

    if (state.activeSection === "posts") {
      appendChip(item.status || "draft", item.status === "published" ? "success" : "default");
      appendChip(item.category || "general");
      appendChip(formatDateLabel(item.published_at));
    } else if (state.activeSection === "projects") {
      appendChip(item.status || "published", "accent");
      appendChip(`ordem ${item.order ?? 999}`);
      appendChip((item.stack || []).slice(0, 2).join(" · "));
    } else if (state.activeSection === "documents") {
      appendChip(item.category || "document");
      appendChip(item.version || "v1");
      appendChip(formatDateLabel(item.published_at));
    }

    appendChip(localeBadges(item), "muted");
    button.append(title, summary, metaRow);
    button.addEventListener("click", () => openItem(state.activeSection, itemKey(state.activeSection, item)));

    const li = document.createElement("li");
    li.append(button);
    contentList.append(li);
  });
};

const resetPostForm = () => {
  state.current.posts = null;
  state.slugTouched.posts = false;
  fillPostForm({
    source_path: "",
    id: "",
    slug: "",
    status: "draft",
    category: "engineering",
    title: "",
    summary: "",
    body: "",
    title_en_us: "",
    summary_en_us: "",
    body_en_us: "",
    title_ja_jp: "",
    summary_ja_jp: "",
    body_ja_jp: "",
    published_at: "",
    updated_at: "",
    tags: [],
    badges: [],
    repo_url: "",
    code_url: "",
    featured: false,
    has_asciimath: false,
    impact: [],
    trade_offs: [],
    lessons: [],
  });
};

const resetProjectForm = () => {
  state.current.projects = null;
  state.slugTouched.projects = false;
  fillProjectForm({
    source_path: "",
    slug: "",
    status: "published",
    order: 999,
    stack: [],
    badges: [],
    repo_url: "",
    code_url: "",
    docs_url: "",
    architecture_url: "",
    featured: false,
    diagram_format: "mermaid",
    diagram_preview: "",
    name: "",
    headline: "",
    summary: "",
    overview: "",
    problem_solution: "",
    architecture: "",
    stack_notes: "",
    production_notes: "",
    adr: [],
    roadmap: [],
    impact: [],
    trade_offs: [],
    lessons: [],
    name_en_us: "",
    headline_en_us: "",
    summary_en_us: "",
    overview_en_us: "",
    problem_solution_en_us: "",
    architecture_en_us: "",
    stack_notes_en_us: "",
    production_notes_en_us: "",
    adr_en_us: [],
    roadmap_en_us: [],
    impact_en_us: [],
    trade_offs_en_us: [],
    lessons_en_us: [],
    name_ja_jp: "",
    headline_ja_jp: "",
    summary_ja_jp: "",
    overview_ja_jp: "",
    problem_solution_ja_jp: "",
    architecture_ja_jp: "",
    stack_notes_ja_jp: "",
    production_notes_ja_jp: "",
    adr_ja_jp: [],
    roadmap_ja_jp: [],
    impact_ja_jp: [],
    trade_offs_ja_jp: [],
    lessons_ja_jp: [],
  });
};

const resetDocumentForm = () => {
  state.current.documents = null;
  state.slugTouched.documents = false;
  fillDocumentForm({
    source_path: "",
    body_source_path: "",
    slug: "",
    category: "architecture",
    version: "v1",
    tags: [],
    agent_generated_tag: false,
    order: 999,
    published_at: "",
    title: "",
    summary: "",
    body: "",
    title_en_us: "",
    summary_en_us: "",
    body_en_us: "",
    title_ja_jp: "",
    summary_ja_jp: "",
    body_ja_jp: "",
  });
};

const resetCurrentForm = () => {
  if (state.activeSection === "posts") {
    resetPostForm();
  } else if (state.activeSection === "projects") {
    resetProjectForm();
  } else if (state.activeSection === "documents") {
    resetDocumentForm();
  }
  updateChrome();
  renderPreviewEmpty("Preencha o formulario e clique em “Visualizar” para renderizar o item atual.");
  renderCollection();
};

const updateChrome = () => {
  const meta = SECTION_META[state.activeSection];
  editorKicker.textContent = meta.kicker;
  editorTitle.textContent = currentEditorTitle();
  previewTitle.textContent = meta.previewTitle;
  previewCopy.textContent = meta.previewCopy;

  Object.entries(panels).forEach(([section, panel]) => {
    panel.hidden = section !== state.activeSection;
  });

  const siteMode = state.activeSection === "site";
  saveSiteButton.hidden = !siteMode;
  saveCurrentButton.hidden = siteMode;
  previewCurrentButton.hidden = siteMode;
  deleteCurrentButton.hidden = siteMode;
  previewField.hidden = siteMode;

  if (siteMode) {
    renderSitePreview();
  }

  deleteCurrentButton.disabled = !isCurrentPersisted();
  sectionsLink.hidden = state.activeSection !== "projects";
};

const openItem = async (section, key) => {
  const url =
    section === "posts"
      ? `/api/post?id=${encodeURIComponent(key)}`
      : section === "projects"
        ? `/api/project?slug=${encodeURIComponent(key)}`
        : `/api/document?slug=${encodeURIComponent(key)}`;

  const payload = await fetchJson(url);
  if (section === "posts") {
    state.current.posts = payload;
    state.slugTouched.posts = true;
    fillPostForm(payload);
  } else if (section === "projects") {
    state.current.projects = payload;
    state.slugTouched.projects = true;
    fillProjectForm(payload);
  } else {
    state.current.documents = payload;
    state.slugTouched.documents = true;
    fillDocumentForm(payload);
  }

  updateChrome();
  renderCollection();
  await previewCurrent(true);
  setNotice(`${SECTION_META[section].title.slice(0, -1)} carregado.`, "success");
};

const previewPayload = () => {
  if (state.activeSection === "posts") {
    return readPostForm();
  }
  if (state.activeSection === "projects") {
    return readProjectForm();
  }
  if (state.activeSection === "documents") {
    return readDocumentForm();
  }
  return {};
};

const previewRoute = () => {
  if (state.activeSection === "posts") {
    return "/api/post/preview";
  }
  if (state.activeSection === "projects") {
    return "/api/project/preview";
  }
  return "/api/document/preview";
};

const saveRoute = () => {
  if (state.activeSection === "posts") {
    return "/api/post/save";
  }
  if (state.activeSection === "projects") {
    return "/api/project/save";
  }
  return "/api/document/save";
};

const deleteRoute = () => {
  if (state.activeSection === "posts") {
    return "/api/post/delete";
  }
  if (state.activeSection === "projects") {
    return "/api/project/delete";
  }
  return "/api/document/delete";
};

const rerenderMermaid = () => {
  if (!window.mermaid) {
    return;
  }
  try {
    mermaid.init(undefined, ".mermaid");
  } catch (error) {
    console.error("Mermaid error:", error);
  }
};

const previewCurrent = async (silent = false) => {
  if (state.activeSection === "site") {
    renderSitePreview();
    return;
  }

  const payload = await fetchJson(previewRoute(), {
    method: "POST",
    body: JSON.stringify({
      ...previewPayload(),
      locale: previewLocale.value,
      _preview_locale: previewLocale.value,
    }),
  });

  preview.innerHTML = payload.html;
  rerenderMermaid();

  if (!silent) {
    setNotice("Preview atualizado.");
  }
};

const saveSite = async () => {
  const payload = await fetchJson("/api/site/save", {
    method: "POST",
    body: JSON.stringify(formToObject(siteForm)),
  });
  state.site = payload.site;
  fillSiteForm(payload.site);
  renderSitePreview();
  setNotice("Configuracao do blog salva.", "success");
};

const saveCurrent = async () => {
  const payload = await fetchJson(saveRoute(), {
    method: "POST",
    body: JSON.stringify(previewPayload()),
  });

  applyStatePayload(payload);

  if (state.activeSection === "posts") {
    state.current.posts = payload.post;
    state.slugTouched.posts = true;
    fillPostForm(payload.post);
  } else if (state.activeSection === "projects") {
    state.current.projects = payload.project;
    state.slugTouched.projects = true;
    fillProjectForm(payload.project);
  } else {
    state.current.documents = payload.document;
    state.slugTouched.documents = true;
    fillDocumentForm(payload.document);
  }

  updateChrome();
  await previewCurrent(true);
  setNotice("Item salvo.", "success");
};

const deleteCurrent = async () => {
  if (!isCurrentPersisted()) {
    setNotice("Nenhum item salvo selecionado para exclusao.", "error");
    return;
  }

  const form = activeForm();
  const labelField = state.activeSection === "projects" ? "name" : "title";
  const label = form.elements.namedItem(labelField)?.value.trim() || currentPersistedKey();
  if (!window.confirm(`Excluir "${label}"?`)) {
    return;
  }

  const identifier =
    state.activeSection === "posts"
      ? { id: currentPersistedKey() }
      : { slug: currentPersistedKey() };

  const payload = await fetchJson(deleteRoute(), {
    method: "POST",
    body: JSON.stringify(identifier),
  });

  applyStatePayload(payload);
  resetCurrentForm();

  const items = activeCollection();
  if (items.length) {
    await openItem(state.activeSection, itemKey(state.activeSection, items[0]));
  } else if (state.activeSection === "site") {
    renderSitePreview();
  } else {
    renderPreviewEmpty("Nenhum item restante nesta area.");
  }

  setNotice("Item excluido.", "success");
};

const refreshState = async () => {
  const payload = await fetchJson("/api/state");
  applyStatePayload(payload);
  fillSiteForm(payload.site);
  updateChrome();

  if (state.activeSection === "site") {
    renderSitePreview();
    return;
  }

  const items = activeCollection();
  if (items.length) {
    await openItem(state.activeSection, itemKey(state.activeSection, items[0]));
  } else {
    resetCurrentForm();
  }
};

const refreshStorageStatus = async () => {
  const payload = await fetchJson("/api/storage/status");
  renderStorageStatus(payload);
  setNotice("Status do armazenamento atualizado.");
};

const importPostsToDatabase = async () => {
  const payload = await fetchJson("/api/storage/import", {
    method: "POST",
    body: JSON.stringify({}),
  });
  renderStorageStatus(payload.storage);
  await refreshState();
  setNotice(`${payload.import.imported} post(s) importado(s) para o PostgreSQL.`, "success");
};

const exportPostsToToml = async () => {
  const payload = await fetchJson("/api/storage/export", {
    method: "POST",
    body: JSON.stringify({}),
  });
  renderStorageStatus(payload.storage);
  setNotice(`${payload.export.exported} post(s) exportado(s) para TOML.`, "success");
};

const buildSite = async () => {
  const payload = await fetchJson("/api/build", {
    method: "POST",
    body: JSON.stringify({}),
  });
  renderGitStatus(payload.git);
  setNotice(`Build concluido com ${payload.build.published_posts} post(s) publicados.`, "success");
};

const publishBlog = async () => {
  const payload = await fetchJson("/api/publish", {
    method: "POST",
    body: JSON.stringify({
      message: commitMessage.value.trim(),
      push: pushAfterCommit.checked,
    }),
  });
  renderGitStatus(payload.git);
  if (payload.publish.committed) {
    commitMessage.value = "";
    setNotice(payload.publish.pushed ? "Build, commit e push concluidos." : "Build e commit concluidos.", "success");
    return;
  }
  setNotice(payload.publish.message, "info");
};

const refreshGitStatus = async () => {
  const payload = await fetchJson("/api/git/status");
  renderGitStatus(payload);
  setNotice("Status do Git atualizado.");
};

const switchSection = async (section) => {
  state.activeSection = section;
  updateChrome();
  renderCollection();

  if (section === "site") {
    renderSitePreview();
    return;
  }

  const current = state.current[section];
  const key = current ? itemKey(section, current) : "";
  if (key && persistedItemExists(section, key)) {
    await openItem(section, key);
    return;
  }

  const items = state.collections[section];
  if (items.length) {
    await openItem(section, itemKey(section, items[0]));
    return;
  }

  resetCurrentForm();
};

const titleSourcesForSection = (section) => {
  if (section === "projects") {
    return ["name", "name_en_us", "name_ja_jp"];
  }
  return ["title", "title_en_us", "title_ja_jp"];
};

const slugFieldForSection = (section) => {
  if (section === "posts") {
    return postForm.elements.namedItem("slug");
  }
  if (section === "projects") {
    return projectForm.elements.namedItem("slug");
  }
  return documentForm.elements.namedItem("slug");
};

const updateSlugFromPrimaryInputs = (section) => {
  if (state.slugTouched[section]) {
    return;
  }
  const form = forms[section];
  const title = titleSourcesForSection(section)
    .map((name) => form.elements.namedItem(name)?.value.trim() || "")
    .find(Boolean);
  slugFieldForSection(section).value = slugify(title || "");
};

const insertTextAtCursor = (textarea, text) => {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
};

const wrapSelection = (textarea, prefix, suffix, placeholder) => {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selected = textarea.value.slice(start, end) || placeholder;
  const replacement = `${prefix}${selected}${suffix}`;
  textarea.setRangeText(replacement, start, end, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
};

const prefixLines = (textarea, prefix, numbered = false) => {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selected = textarea.value.slice(start, end) || "item";
  const lines = selected.split("\n").map((line, index) => {
    if (!line.trim()) {
      return line;
    }
    return numbered ? `${index + 1}. ${line.replace(/^\d+\.\s+/, "")}` : `${prefix}${line.replace(/^[-*]\s+/, "")}`;
  });
  textarea.setRangeText(lines.join("\n"), start, end, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
};

const applyMarkdownAction = (textarea, action) => {
  if (action === "h1") {
    insertTextAtCursor(textarea, "# ");
    return;
  }
  if (action === "h2") {
    insertTextAtCursor(textarea, "## ");
    return;
  }
  if (action === "bold") {
    wrapSelection(textarea, "**", "**", "texto");
    return;
  }
  if (action === "italic") {
    wrapSelection(textarea, "*", "*", "texto");
    return;
  }
  if (action === "link") {
    wrapSelection(textarea, "[", "](https://example.com)", "texto");
    return;
  }
  if (action === "quote") {
    prefixLines(textarea, "> ");
    return;
  }
  if (action === "code") {
    wrapSelection(textarea, "`", "`", "codigo");
    return;
  }
  if (action === "codeblock") {
    insertTextAtCursor(textarea, "\n```text\ncodigo\n```\n");
    return;
  }
  if (action === "ul") {
    prefixLines(textarea, "- ");
    return;
  }
  if (action === "ol") {
    prefixLines(textarea, "", true);
    return;
  }
  if (action === "table") {
    insertTextAtCursor(textarea, "\n| Coluna | Valor |\n| --- | --- |\n| item | valor |\n");
    return;
  }
  if (action === "image") {
    insertTextAtCursor(textarea, "![descricao](/assets/images/posts/imagem.png)");
    return;
  }
  if (action === "mermaid") {
    insertTextAtCursor(textarea, "\n```mermaid\nflowchart LR\n  A[Origem] --> B[Destino]\n```\n");
    return;
  }
  if (action === "hr") {
    insertTextAtCursor(textarea, "\n---\n");
  }
};

const enhanceMarkdownInputs = () => {
  document.querySelectorAll(".markdown-input").forEach((textarea) => {
    if (textarea.dataset.enhanced === "true") {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "editor-shell";
    const toolbar = document.createElement("div");
    toolbar.className = "format-toolbar";

    MARKDOWN_ACTIONS.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.title = action.title;
      button.dataset.action = action.key;
      button.addEventListener("click", () => applyMarkdownAction(textarea, action.key));
      toolbar.append(button);
    });

    textarea.parentNode.insertBefore(shell, textarea);
    shell.append(toolbar, textarea);
    textarea.dataset.enhanced = "true";

    textarea.addEventListener("dragover", (event) => {
      event.preventDefault();
      textarea.classList.add("dragover");
    });
    textarea.addEventListener("dragleave", () => {
      textarea.classList.remove("dragover");
    });
    textarea.addEventListener("drop", async (event) => {
      textarea.classList.remove("dragover");
      await handleImageDrop(event, textarea);
    });
  });
};

const uploadImage = async (file) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (event) => {
      try {
        const payload = await fetchJson("/api/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content: event.target.result,
          }),
        });
        resolve(payload.url);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
};

const handleImageDrop = async (event, textarea) => {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (!files.length) {
    return;
  }

  setNotice("Subindo imagem...");
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue;
    }
    try {
      const url = await uploadImage(file);
      insertTextAtCursor(textarea, `![${file.name}](${url})`);
    } catch (error) {
      setNotice(`Erro no upload: ${error.message}`, "error");
      return;
    }
  }
  await previewCurrent(true);
  setNotice("Imagem carregada.", "success");
};

const schedulePreview = () => {
  if (state.activeSection === "site") {
    renderSitePreview();
    return;
  }

  window.clearTimeout(state.previewTimer);
  state.previewTimer = window.setTimeout(async () => {
    try {
      await previewCurrent(true);
    } catch (error) {
      console.error(error);
    }
  }, 350);
};

const bindFormSignals = () => {
  [postForm, projectForm, documentForm].forEach((form) => {
    form.addEventListener("input", () => {
      updateChrome();
      schedulePreview();
    });
    form.addEventListener("change", () => {
      updateChrome();
      schedulePreview();
    });
  });

  siteForm.addEventListener("input", () => {
    if (state.activeSection === "site") {
      renderSitePreview();
    }
  });
};

document.querySelector("#refresh-storage").addEventListener("click", async () => {
  try {
    await refreshStorageStatus();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#refresh-status").addEventListener("click", async () => {
  try {
    await refreshGitStatus();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

saveSiteButton.addEventListener("click", async () => {
  try {
    await saveSite();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

saveCurrentButton.addEventListener("click", async () => {
  try {
    await saveCurrent();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

previewCurrentButton.addEventListener("click", async () => {
  try {
    await previewCurrent();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

deleteCurrentButton.addEventListener("click", async () => {
  try {
    await deleteCurrent();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

buildSiteButton.addEventListener("click", async () => {
  try {
    await buildSite();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#publish-blog").addEventListener("click", async () => {
  try {
    await publishBlog();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

importPostsButton.addEventListener("click", async () => {
  try {
    await importPostsToDatabase();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

exportPostsButton.addEventListener("click", async () => {
  try {
    await exportPostsToToml();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

newEntryButton.addEventListener("click", () => {
  resetCurrentForm();
  setNotice(`${SECTION_META[state.activeSection].newLabel} preparado.`, "success");
});

searchItems.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCollection();
});

previewLocale.addEventListener("change", () => {
  state.activeLocale = previewLocale.value;
  syncLocaleTabs();
  schedulePreview();
});

document.querySelectorAll("[data-locale-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeLocale = button.dataset.localeTab;
    previewLocale.value = state.activeLocale;
    syncLocaleTabs();
    schedulePreview();
  });
});

sectionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await switchSection(button.dataset.sectionSwitch);
    } catch (error) {
      setNotice(error.message, "error");
    }
  });
});

postForm.elements.namedItem("slug").addEventListener("input", () => {
  state.slugTouched.posts = Boolean(postForm.elements.namedItem("slug").value.trim());
});
projectForm.elements.namedItem("slug").addEventListener("input", () => {
  state.slugTouched.projects = Boolean(projectForm.elements.namedItem("slug").value.trim());
});
documentForm.elements.namedItem("slug").addEventListener("input", () => {
  state.slugTouched.documents = Boolean(documentForm.elements.namedItem("slug").value.trim());
});

titleSourcesForSection("posts").forEach((name) => {
  postForm.elements.namedItem(name).addEventListener("input", () => updateSlugFromPrimaryInputs("posts"));
});
titleSourcesForSection("projects").forEach((name) => {
  projectForm.elements.namedItem(name).addEventListener("input", () => updateSlugFromPrimaryInputs("projects"));
});
titleSourcesForSection("documents").forEach((name) => {
  documentForm.elements.namedItem(name).addEventListener("input", () => updateSlugFromPrimaryInputs("documents"));
});

documentForm.elements.namedItem("body_source_path").addEventListener("input", () => {
  updateDocumentSourceHint();
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: false });
    }
    enhanceMarkdownInputs();
    bindFormSignals();
    await refreshState();
    setNotice("Editor carregado.");
  } catch (error) {
    console.error(error);
    setNotice(error.message, "error");
  }
});
