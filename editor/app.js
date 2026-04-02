const state = {
  site: {},
  posts: [],
  currentPost: null,
  search: "",
  slugTouched: false,
};

const siteForm = document.querySelector("#site-form");
const postForm = document.querySelector("#post-form");
const postList = document.querySelector("#post-list");
const gitStatus = document.querySelector("#git-status");
const preview = document.querySelector("#preview");
const notice = document.querySelector("#notice");
const searchPosts = document.querySelector("#search-posts");
const commitMessage = document.querySelector("#commit-message");
const pushAfterCommit = document.querySelector("#push-after-commit");
const postTitleInput = document.querySelector("#post-title");
const postSlugInput = document.querySelector("#post-slug");

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Falha na requisição.");
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
    .replace(/^-+|-+$/g, "") || "post";

const formatPostLabel = (post) => {
  const status = post.status === "published" ? "published" : "draft";
  return `${post.title || "Sem título"} · ${status}`;
};

const formToObject = (form) => {
  const data = new FormData(form);
  const result = {};
  for (const [key, value] of data.entries()) {
    result[key] = value;
  }
  return result;
};

const renderGitStatus = (git) => {
  const scoped = git.scoped.length ? git.scoped.join("\n") : "Sem mudanças do blog no momento.";
  const full = git.full.length ? git.full.join("\n") : "Worktree limpo.";
  gitStatus.textContent = `Escopo do blog:\n${scoped}\n\nRepositório inteiro:\n${full}`;
};

const renderPosts = () => {
  const filter = state.search.trim().toLowerCase();
  const filtered = state.posts.filter((post) => {
    if (!filter) {
      return true;
    }
    const haystack = `${post.title} ${post.summary} ${(post.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(filter);
  });

  postList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhum post encontrado.";
    postList.append(empty);
    return;
  }

  for (const post of filtered) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.active = String(state.currentPost?.id === post.id);
    const title = document.createElement("strong");
    title.textContent = post.title || "Sem título";
    const date = document.createElement("span");
    date.textContent = post.published_at || "sem data";
    const tags = document.createElement("span");
    tags.textContent = (post.tags || []).join(", ") || "sem tags";
    button.append(title, date, tags);
    button.addEventListener("click", () => openPost(post.id));
    item.append(button);
    postList.append(item);
  }
};

const fillSiteForm = (site) => {
  for (const [key, value] of Object.entries(site)) {
    const field = siteForm.elements.namedItem(key);
    if (field) {
      field.value = value ?? "";
    }
  }
};

const resetPostForm = () => {
  state.currentPost = {
    id: "",
    status: "draft",
    title: "",
    slug: "",
    summary: "",
    published_at: "",
    updated_at: "",
    tags: [],
    has_asciimath: false,
    body: "",
  };
  state.slugTouched = false;
  fillPostForm(state.currentPost);
  preview.innerHTML = '<p class="empty-preview">Clique em “Visualizar” para renderizar o post atual.</p>';
  renderPosts();
};

const fillPostForm = (post) => {
  for (const element of postForm.elements) {
    if (!element.name) {
      continue;
    }
    if (element.type === "checkbox") {
      element.checked = Boolean(post[element.name]);
      continue;
    }
    if (element.name === "tags") {
      element.value = (post.tags || []).join(", ");
      continue;
    }
    element.value = post[element.name] ?? "";
  }
};

const readPostForm = () => ({
  ...formToObject(postForm),
  has_asciimath: postForm.elements.namedItem("has_asciimath").checked,
  tags: formToObject(postForm).tags,
});

const openPost = async (id) => {
  const post = await fetchJson(`/api/post?id=${encodeURIComponent(id)}`);
  state.currentPost = post;
  state.slugTouched = true;
  fillPostForm(post);
  renderPosts();
  setNotice(`Post carregado: ${formatPostLabel(post)}.`);
};

const refreshState = async (preferredId = null) => {
  const payload = await fetchJson("/api/state");
  state.site = payload.site;
  state.posts = payload.posts;
  fillSiteForm(state.site);
  renderGitStatus(payload.git);

  if (preferredId) {
    const match = state.posts.find((post) => post.id === preferredId);
    if (match) {
      await openPost(preferredId);
      return;
    }
  }

  if (!state.currentPost && state.posts.length) {
    await openPost(state.posts[0].id);
    return;
  }

  renderPosts();
};

const saveSite = async () => {
  const site = formToObject(siteForm);
  const payload = await fetchJson("/api/site/save", {
    method: "POST",
    body: JSON.stringify(site),
  });
  state.site = payload.site;
  fillSiteForm(payload.site);
  setNotice("Configuração do blog salva.", "success");
};

const savePost = async () => {
  const post = readPostForm();
  const payload = await fetchJson("/api/post/save", {
    method: "POST",
    body: JSON.stringify(post),
  });
  state.posts = payload.posts;
  state.currentPost = payload.post;
  state.slugTouched = true;
  fillPostForm(payload.post);
  renderPosts();
  setNotice("Post salvo em TOML.", "success");
};

const previewPost = async () => {
  const post = readPostForm();
  const payload = await fetchJson("/api/post/preview", {
    method: "POST",
    body: JSON.stringify(post),
  });
  preview.innerHTML = payload.html;
  setNotice("Preview atualizado.");
};

const buildSite = async () => {
  const payload = await fetchJson("/api/build", {
    method: "POST",
    body: JSON.stringify({}),
  });
  renderGitStatus(payload.git);
  setNotice(`Build concluído com ${payload.build.published_posts} post(s) publicados.`, "success");
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
    setNotice(
      payload.publish.pushed
        ? "Build, commit e push concluídos."
        : "Build e commit concluídos.",
      "success",
    );
    commitMessage.value = "";
  } else {
    setNotice(payload.publish.message, "info");
  }
};

const refreshGitStatus = async () => {
  const payload = await fetchJson("/api/git/status");
  renderGitStatus(payload);
  setNotice("Status do Git atualizado.");
};

document.querySelector("#save-site").addEventListener("click", async () => {
  try {
    await saveSite();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#save-post").addEventListener("click", async () => {
  try {
    await savePost();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#preview-post").addEventListener("click", async () => {
  try {
    await previewPost();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#build-site").addEventListener("click", async () => {
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

document.querySelector("#refresh-status").addEventListener("click", async () => {
  try {
    await refreshGitStatus();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelector("#new-post").addEventListener("click", () => {
  resetPostForm();
  setNotice("Novo rascunho preparado.");
});

searchPosts.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderPosts();
});

postSlugInput.addEventListener("input", () => {
  state.slugTouched = postSlugInput.value.trim().length > 0;
});

postTitleInput.addEventListener("input", () => {
  if (state.slugTouched) {
    return;
  }
  postSlugInput.value = slugify(postTitleInput.value);
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await refreshState();
    if (!state.posts.length) {
      resetPostForm();
    }
    setNotice("Editor carregado.");
  } catch (error) {
    setNotice(error.message, "error");
  }
});
