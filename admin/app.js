(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const Project = window.StorybookProject;
  const Themes = window.StorybookThemes;
  const secretKey = "storybook:admin-secret";
  const RESULT_ART = Object.freeze({
    spiderman: "/assets/themes/spiderman/spiderman-character.webp",
    batman: "/assets/themes/batman/noir-emblem.webp"
  });

  let secret = sessionStorage.getItem(secretKey) || "";
  let pendingCreate = "";
  let pendingDelete = "";
  let copyResetTimer = 0;

  function apiBase() {
    return (window.STORYBOOK_RUNTIME?.apiBaseUrl || $("meta[name='gift-api-base']")?.content || "").replace(/\/$/, "");
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || `HTTP ${response.status}`), { status: response.status });
    return payload;
  }

  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.hidden = false;
    window.setTimeout(() => { node.hidden = true; }, 2200);
  }

  function login() {
    $("#login-screen").hidden = true;
    $("#admin-app").hidden = false;
    load();
  }

  function logout() {
    secret = "";
    sessionStorage.removeItem(secretKey);
    $("#admin-app").hidden = true;
    $("#login-screen").hidden = false;
  }

  function frontend(url) {
    try {
      const target = new URL(url);
      if (["localhost", "127.0.0.1"].includes(location.hostname)) {
        target.protocol = location.protocol;
        target.hostname = location.hostname;
        target.port = location.port;
        const studioMatch = target.pathname.match(/^\/studio\/([^/?#]+)/i);
        if (studioMatch) {
          target.pathname = "/studio/index.html";
          target.searchParams.set("project", studioMatch[1]);
        }
        const giftMatch = target.pathname.match(/^\/gift\/([^/?#]+)/i);
        if (giftMatch) {
          target.pathname = "/gift/index.html";
          target.searchParams.set("project", giftMatch[1]);
        }
      }
      return target.toString();
    } catch {
      return url;
    }
  }

  function format(value) {
    return value
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
      : "—";
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Continue to the selection fallback for restrictive browser contexts.
      }
    }
    const input = $("#created-studio-url");
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    if (!document.execCommand("copy")) throw new Error("Browser tidak mengizinkan penyalinan otomatis.");
  }

  function renderCard(project) {
    const fragment = $("#project-card-template").content.cloneNode(true);
    const card = $("article", fragment);
    $(".status", card).textContent = project.status;
    $(".status", card).dataset.status = project.status;
    $(".theme", card).textContent = Themes.getTheme(project.themeId).label;
    $(".occasion", card).textContent = Project.OCCASION_PRESETS[project.occasionPreset]?.label.id || project.occasionPreset;
    $(".project-id", card).textContent = project.projectId;
    $(".recipient", card).textContent = project.recipient || "Belum diisi";
    $(".sender", card).textContent = project.sender || "Belum diisi";
    $(".updated", card).textContent = format(project.updatedAt);
    $(".media-count", card).textContent = project.galleryCount;
    $(".source", card).textContent = project.source;

    const studio = frontend(project.studioUrl);
    const gift = frontend(project.giftUrl);
    $(".open-studio", card).href = studio;
    $(".open-gift", card).href = gift;
    $(".open-gift", card).style.pointerEvents = project.status === "published" ? "" : "none";
    $(".copy-studio", card).onclick = async () => {
      try {
        await navigator.clipboard.writeText(studio);
        toast("Studio link disalin.");
      } catch {
        toast("Link belum dapat disalin. Buka Studio lalu salin dari browser.");
      }
    };

    const archive = $(".archive", card);
    archive.textContent = project.status === "archived" ? "Restore" : "Archive";
    archive.onclick = () => updateStatus(project.projectId, project.status === "archived" ? "restore" : "archive");
    $(".delete", card).onclick = () => openDelete(project.projectId);
    $("#project-grid").append(fragment);
  }

  async function load() {
    $("#loading").hidden = false;
    try {
      const query = new URLSearchParams({
        search: $("#project-search").value,
        status: $("#status-filter").value,
        limit: "100"
      });
      const data = await request(`/api/admin/projects?${query}`);
      $("#stat-total").textContent = data.stats.total;
      $("#stat-draft").textContent = data.stats.draft;
      $("#stat-published").textContent = data.stats.published;
      $("#stat-archived").textContent = data.stats.archived;
      $("#project-grid").replaceChildren();
      data.projects.forEach(renderCard);
      $("#empty").hidden = Boolean(data.projects.length);
    } catch (error) {
      if (error.status === 403) return logout();
      toast(error.message);
    } finally {
      $("#loading").hidden = true;
    }
  }

  function setGenerateBusy(isBusy) {
    const button = $("#generate-project");
    button.disabled = isBusy;
    button.setAttribute("aria-busy", String(isBusy));
    $("#generate-project-label").textContent = isBusy ? "Membuat Studio..." : "Generate Studio Link";
  }

  function showCreatedProject(result) {
    const theme = Themes.getTheme(result.themeId || "spiderman");
    const studioUrl = frontend(result.studioUrl);
    if (!studioUrl) throw new Error("Worker tidak mengembalikan Studio link.");

    const dialog = $("#result-dialog");
    dialog.dataset.theme = theme.id;
    $("#created-theme-label").textContent = `${theme.label} Theme`;
    $("#created-project-id").textContent = result.projectId || "New project";
    $("#created-studio-url").value = studioUrl;
    $("#open-created").href = studioUrl;

    const artwork = $("#created-theme-art");
    artwork.src = RESULT_ART[theme.id] || theme.assets?.openingEmblem || "";
    artwork.hidden = !artwork.src;
    artwork.onerror = () => { artwork.hidden = true; };

    window.clearTimeout(copyResetTimer);
    $("#copy-created").classList.remove("is-copied");
    $("#copy-created-label").textContent = "Copy Studio Link";
    dialog.showModal();
    window.requestAnimationFrame(() => $("#copy-created").focus());
  }

  async function create() {
    if (!pendingCreate) pendingCreate = `manual-${crypto.randomUUID?.() || Date.now()}`;
    setGenerateBusy(true);
    try {
      const result = await request("/api/admin/projects", {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: pendingCreate })
      });
      pendingCreate = "";
      showCreatedProject(result.project || result);
      void load();
    } catch (error) {
      toast(error.message);
    } finally {
      setGenerateBusy(false);
    }
  }

  async function updateStatus(id, action) {
    try {
      await request(`/api/admin/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ action })
      });
      load();
    } catch (error) {
      toast(error.message);
    }
  }

  function openDelete(id) {
    pendingDelete = id;
    $("#delete-project-id").textContent = id;
    $("#delete-confirmation").value = "";
    $("#confirm-delete").disabled = true;
    $("#delete-dialog").showModal();
  }

  async function remove() {
    try {
      await request(`/api/admin/projects/${encodeURIComponent(pendingDelete)}`, { method: "DELETE" });
      $("#delete-dialog").close();
      load();
    } catch (error) {
      toast(error.message);
    }
  }

  $("#login-form").onsubmit = async event => {
    event.preventDefault();
    secret = $("#admin-secret").value.trim();
    try {
      await request("/api/admin/projects?limit=1");
      sessionStorage.setItem(secretKey, secret);
      login();
    } catch (error) {
      $("#login-error").textContent = error.status === 403 ? "Admin secret tidak cocok." : error.message;
    }
  };

  $("#logout").onclick = logout;
  $("#refresh-projects").onclick = load;
  $("#generate-project").onclick = create;
  $("#project-search").oninput = () => {
    clearTimeout(window.__search);
    window.__search = setTimeout(load, 250);
  };
  $("#status-filter").onchange = load;
  $("#copy-created").onclick = async () => {
    try {
      await copyText($("#created-studio-url").value);
      const button = $("#copy-created");
      button.classList.add("is-copied");
      $("#copy-created-label").textContent = "Link tersalin";
      toast("Studio link disalin.");
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        $("#copy-created-label").textContent = "Copy Studio Link";
      }, 2200);
    } catch (error) {
      toast(error.message);
    }
  };

  document.querySelectorAll("dialog .close").forEach(button => {
    button.onclick = () => button.closest("dialog").close();
  });

  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      const isBackdrop = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (isBackdrop) dialog.close();
    });
  });

  $("#result-dialog").addEventListener("close", () => $("#generate-project").focus());
  $("#delete-confirmation").oninput = event => { $("#confirm-delete").disabled = event.target.value !== pendingDelete; };
  $("#confirm-delete").onclick = remove;

  if (secret) login();
})();
