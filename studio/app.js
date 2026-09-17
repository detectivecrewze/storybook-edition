(function () {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const Project = window.StorybookProject;
  const Themes = window.StorybookThemes;
  const I18n = window.StorybookI18n;
  const projectId = Project.projectIdFromPath(location.pathname, location.search);
  const tokenKey = `storybook:token:${projectId}`;
  const hashToken = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  if (hashToken) { sessionStorage.setItem(tokenKey, hashToken); history.replaceState({}, "", `${location.pathname}${location.search}`); }
  const token = hashToken || sessionStorage.getItem(tokenKey) || "";
  const api = new window.StorybookApi(projectId, token);
  let draft;
  let currentStep = 1;
  let saveTimer = 0;
  let saveQueue = Promise.resolve();
  let dragging = null;
  let catalog = [];
  let giftUrl = "";
  let published = false;

  function setState(title, message, retry = false) { $("#studio-state strong").textContent = title; $("#studio-state p").textContent = message; $("#studio-retry").hidden = !retry; $("#studio-state").hidden = false; $("#studio-app").hidden = true; }
  function saveIndicator(state) { const node = $("#save-state"); node.className = `save-state is-${state}`; node.textContent = state === "saving" ? I18n.t("studio.saving") : state === "dirty" ? I18n.t("studio.unsaved") : I18n.t("studio.autosaved"); }
  function queueSave() { clearTimeout(saveTimer); saveIndicator("dirty"); saveTimer = setTimeout(saveDraft, 650); sendPreview(); }
  function saveDraft() {
    clearTimeout(saveTimer); syncAll(); saveIndicator("saving");
    saveQueue = saveQueue.catch(() => {}).then(() => api.saveStudio(draft, "draft")).then(result => { draft = Project.normalizeProject(result.project || draft, projectId, draft); saveIndicator("saved"); }).catch(error => { saveIndicator("dirty"); console.error(error); });
    return saveQueue;
  }
  function sendPreview() { const frame = $("#gift-preview"); if (frame?.contentWindow && draft) frame.contentWindow.postMessage({ type: "storybook-preview", project: draft }, location.origin); }
  function setImagePreview(host, item) { host.replaceChildren(); if (!item.mediaUrl) { host.textContent = "MEDIA"; return; } const media = document.createElement(item.mediaType === "video" ? "video" : "img"); if (item.mediaType === "video") { media.muted = true; media.playsInline = true; } media.src = item.mediaUrl; host.append(media); }
  function swap(list, index, delta) { const next = index + delta; if (next < 0 || next >= list.length) return; [list[index], list[next]] = [list[next], list[index]]; }
  function dragSort(container, list, rerender) {
    $$("[draggable='true']", container).forEach((node, index) => {
      node.addEventListener("dragstart", () => { dragging = index; node.classList.add("is-dragging"); });
      node.addEventListener("dragend", () => { dragging = null; node.classList.remove("is-dragging"); });
      node.addEventListener("dragover", event => event.preventDefault());
      node.addEventListener("drop", event => { event.preventDefault(); if (dragging === null || dragging === index) return; const [item] = list.splice(dragging, 1); list.splice(index, 0, item); rerender(); queueSave(); });
    });
  }

  function renderThemes() {
    const host = $("#theme-grid"); host.replaceChildren();
    Object.values(Themes.THEMES).forEach(theme => { const button = document.createElement("button"); button.type = "button"; button.className = `theme-card${draft.themeId === theme.id ? " is-selected" : ""}`; button.innerHTML = `<img alt=""><span><strong></strong><small></small></span>`; $("img", button).src = theme.thumbnail; $("strong", button).textContent = theme.label; $("small", button).textContent = typeof theme.description === "string" ? theme.description : theme.description[draft.settings.language] || theme.description.id; button.addEventListener("click", () => { draft.themeId = theme.id; renderThemes(); queueSave(); }); host.append(button); });
  }
  function renderOccasions() { const select = $("#occasion-preset"); select.replaceChildren(...Object.values(Project.OCCASION_PRESETS).map(preset => { const option = document.createElement("option"); option.value = preset.id; option.textContent = preset.label[draft.settings.language]; return option; })); select.value = draft.occasionPreset; }
  function renderReasons() {
    const host = $("#reasons-list"); host.replaceChildren(); draft.reasons.items.forEach((value, index) => { const fragment = $("#reason-template").content.cloneNode(true); const card = $("article", fragment); $(".field b", card).textContent = index + 1; const input = $("textarea", card); input.value = value; input.addEventListener("input", () => { draft.reasons.items[index] = input.value; queueSave(); }); $("[data-remove]", card).addEventListener("click", () => { if (draft.reasons.items.length <= Project.MIN_REASONS) return; draft.reasons.items.splice(index, 1); renderReasons(); queueSave(); }); $$("[data-move]", card).forEach(button => button.addEventListener("click", () => { swap(draft.reasons.items, index, button.dataset.move === "up" ? -1 : 1); renderReasons(); queueSave(); })); I18n.apply(card); host.append(fragment); }); dragSort(host, draft.reasons.items, renderReasons);
  }
  function renderGallery() {
    const host = $("#gallery-list"); host.replaceChildren(); draft.gallery.items.forEach((item, index) => { const fragment = $("#gallery-template").content.cloneNode(true); const card = $("article", fragment); setImagePreview($(".media-preview", card), item); $(".gallery-title", card).value = item.title; $(".gallery-caption", card).value = item.caption; $(".gallery-title", card).addEventListener("input", event => { item.title = event.target.value; queueSave(); }); $(".gallery-caption", card).addEventListener("input", event => { item.caption = event.target.value; queueSave(); }); $(".gallery-file", card).addEventListener("change", event => uploadGallery(event.target.files[0], item, card)); $("[data-remove]", card).addEventListener("click", () => { draft.gallery.items.splice(index, 1); if (!draft.gallery.items.length) draft.gallery.items.push({ id: Project.makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" }); renderGallery(); queueSave(); }); $$("[data-move]", card).forEach(button => button.addEventListener("click", () => { swap(draft.gallery.items, index, button.dataset.move === "up" ? -1 : 1); renderGallery(); queueSave(); })); I18n.apply(card); host.append(fragment); }); dragSort(host, draft.gallery.items, renderGallery);
  }
  function renderMusic() {
    const host = $("#music-list"); host.replaceChildren(); draft.music.tracks.forEach((track, index) => { const fragment = $("#track-template").content.cloneNode(true); const card = $("article", fragment); $(".track-cover", card).style.backgroundImage = track.coverUrl ? `url('${track.coverUrl}')` : ""; $(".track-title", card).value = track.title; $(".track-artist", card).value = track.artist; $(".track-title", card).addEventListener("input", event => { track.title = event.target.value; queueSave(); }); $(".track-artist", card).addEventListener("input", event => { track.artist = event.target.value; queueSave(); }); $("[data-remove]", card).addEventListener("click", () => { draft.music.tracks.splice(index, 1); renderMusic(); queueSave(); }); I18n.apply(card); host.append(fragment); });
  }
  function renderCatalog(filter = "") { const host = $("#music-catalog"); host.replaceChildren(); const query = filter.trim().toLowerCase(); catalog.filter(track => !query || `${track.title} ${track.artist}`.toLowerCase().includes(query)).slice(0, 30).forEach(track => { const button = document.createElement("button"); button.type = "button"; button.className = "catalog-track"; button.innerHTML = `<img alt=""><span><strong></strong><small></small></span>`; $("img", button).src = track.coverUrl; $("strong", button).textContent = track.title; $("small", button).textContent = track.artist; button.addEventListener("click", () => { if (draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS || draft.music.tracks.some(item => item.audioUrl === track.audioUrl)) return; draft.music.tracks.push({ id: track.id || Project.makeId("track"), sourceType: "catalog", catalogId: track.id || "", audioUrl: track.audioUrl, coverUrl: track.coverUrl || "", title: track.title, artist: track.artist || "" }); renderMusic(); queueSave(); }); host.append(button); }); }
  function renderModules() {
    const host = $("#module-editor"); host.replaceChildren(); draft.modules.sort((a, b) => a.order - b.order).forEach((module, index) => { const fragment = $("#module-template").content.cloneNode(true); const row = $("article", fragment); row.dataset.type = module.type; const toggle = $(".module-enabled", row); toggle.checked = module.enabled; $(".module-title", row).value = module.title; $(".module-subtitle", row).value = module.subtitle; toggle.addEventListener("change", () => { module.enabled = toggle.checked; queueSave(); }); $(".module-title", row).addEventListener("input", event => { module.title = event.target.value; queueSave(); }); $(".module-subtitle", row).addEventListener("input", event => { module.subtitle = event.target.value; queueSave(); }); $$("[data-move]", row).forEach(button => button.addEventListener("click", () => { swap(draft.modules, index, button.dataset.move === "up" ? -1 : 1); draft.modules.forEach((item, order) => item.order = order); renderModules(); queueSave(); })); I18n.apply(row); host.append(fragment); }); dragSort(host, draft.modules, () => { draft.modules.forEach((item, order) => item.order = order); renderModules(); });
  }
  function renderFields() {
    I18n.setLocale(draft.settings.language); I18n.apply(); $("#studio-language").value = draft.settings.language; renderThemes(); renderOccasions();
    $("#recipient").value = draft.identity.recipient; $("#sender").value = draft.identity.sender; $("#event-date").value = draft.identity.eventDate;
    $("#opening-eyebrow").value = draft.opening.eyebrow; $("#opening-title").value = draft.opening.title; $("#opening-message").value = draft.opening.message;
    renderReasons(); renderGallery(); renderMusic(); renderCatalog($("#music-search").value); $("#letter-greeting").value = draft.letter.greeting; $("#letter-body").value = draft.letter.paragraphs.join("\n\n"); $("#letter-signoff").value = draft.letter.signoff;
    renderModules(); $("#finale-title").value = draft.finale.title; $("#finale-message").value = draft.finale.message; $("#finale-signoff").value = draft.finale.signoff; updateGiftResult(); goToStep(currentStep, false); sendPreview();
  }
  function syncAll() {
    if (!draft) return; draft.identity.recipient = $("#recipient").value; draft.identity.sender = $("#sender").value; draft.identity.eventDate = $("#event-date").value;
    draft.opening.eyebrow = $("#opening-eyebrow").value; draft.opening.title = $("#opening-title").value; draft.opening.message = $("#opening-message").value;
    draft.letter.greeting = $("#letter-greeting").value; draft.letter.paragraphs = $("#letter-body").value.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean); draft.letter.signoff = $("#letter-signoff").value;
    draft.finale.title = $("#finale-title").value; draft.finale.message = $("#finale-message").value; draft.finale.signoff = $("#finale-signoff").value;
  }
  function goToStep(step, scroll = true) { currentStep = Math.max(1, Math.min(8, step)); $$(".wizard-step").forEach(node => node.classList.toggle("is-active", Number(node.dataset.step) === currentStep)); $$("#step-list li").forEach(node => node.classList.toggle("is-active", Number($("button", node).dataset.stepTarget) === currentStep)); $("#previous-step").disabled = currentStep === 1; $("#next-step").hidden = currentStep === 8; $("#step-progress").textContent = `${currentStep} / 8`; $("#progress-fill").style.width = `${currentStep / 8 * 100}%`; if (currentStep === 8) sendPreview(); if (scroll) scrollTo({ top: 0, behavior: "smooth" }); }
  function clearErrors() { $$('[data-error]').forEach(node => node.textContent = ""); }
  function showErrors(errors) { clearErrors(); Object.entries(errors).forEach(([key, value]) => { const node = $(`[data-error='${key}']`); if (node) node.textContent = value; }); const stepMap = { recipient: 1, sender: 1, reasons: 3, gallery: 4, music: 5, letter: 6, modules: 7 }; const first = Object.keys(errors)[0]; if (first) goToStep(stepMap[first] || 1); }
  async function imageWebp(file) { const bitmap = await createImageBitmap(file); const targetRatio = 4 / 3; let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height; if (sw / sh > targetRatio) { sw = sh * targetRatio; sx = (bitmap.width - sw) / 2; } else { sh = sw / targetRatio; sy = (bitmap.height - sh) / 2; } const width = Math.min(1600, Math.round(sw)); const height = Math.round(width / targetRatio); const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; canvas.getContext("2d").drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height); bitmap.close(); return new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" })), "image/webp", .86)); }
  async function uploadGallery(file, item, card) { if (!file) return; const isVideo = file.type.startsWith("video/"); const max = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024; if (file.size > max) return alert(I18n.t(isVideo ? "studio.maxVideo" : "studio.maxImage")); const label = $(".upload-button", card); label.textContent = "Uploading..."; try { const uploadFile = isVideo ? file : await imageWebp(file); const result = await api.upload(uploadFile, isVideo ? "video" : "photo"); item.mediaType = isVideo ? "video" : "image"; item.mediaUrl = result.url; renderGallery(); queueSave(); } catch (error) { alert(error.message); renderGallery(); } }
  async function uploadAudio(file) { if (!file) return; if (draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS) return alert(I18n.t("studio.maxTracks")); if (file.size > 20 * 1024 * 1024) return alert(I18n.t("studio.maxAudio")); try { const result = await api.upload(file, "audio"); draft.music.tracks.push({ id: Project.makeId("track"), sourceType: "upload", catalogId: "", audioUrl: result.url, coverUrl: "", title: file.name.replace(/\.[^.]+$/, ""), artist: "" }); renderMusic(); queueSave(); } catch (error) { alert(error.message); } }
  function updateGiftResult() { $("#gift-url").value = giftUrl; $("#open-public-gift").href = giftUrl || "#"; $("#publish-note").textContent = published ? I18n.t("studio.published") : I18n.t("studio.publishHint"); const host = $("#qr-code"); host.replaceChildren(); if (giftUrl && window.QRCode) new QRCode(host, { text: giftUrl, width: 150, height: 150, colorDark: "#17191f", colorLight: "#fffaf0" }); }
  async function publish() { syncAll(); const validation = Project.validateProject(draft, { forPublish: true }); if (!validation.valid) return showErrors(validation.errors); clearErrors(); const button = $("#publish-button"); button.disabled = true; button.textContent = I18n.t("studio.publishing"); try { await saveQueue.catch(() => {}); const result = await api.saveStudio(validation.project, "published"); draft = Project.normalizeProject(result.project || validation.project, projectId, draft); giftUrl = result.giftUrl || giftUrl; published = true; saveIndicator("saved"); updateGiftResult(); sendPreview(); } catch (error) { alert(error.message); } finally { button.disabled = false; button.textContent = I18n.t("studio.publishButton"); } }

  function bind() {
    $("#studio-form").addEventListener("input", event => { if (event.target.closest("#reasons-list,#gallery-list,#music-list,#module-editor")) return; syncAll(); queueSave(); });
    $("#studio-language").addEventListener("change", event => { syncAll(); Project.changeLanguage(draft, event.target.value); renderFields(); queueSave(); });
    $("#occasion-preset").addEventListener("change", event => { if (!confirm(I18n.t("studio.presetWarning"))) { event.target.value = draft.occasionPreset; return; } syncAll(); draft = Project.applyOccasionPreset(draft, event.target.value); renderFields(); queueSave(); });
    $("#add-reason").addEventListener("click", () => { if (draft.reasons.items.length >= Project.MAX_REASONS) return; draft.reasons.items.push(""); renderReasons(); queueSave(); });
    $("#add-gallery").addEventListener("click", () => { if (draft.gallery.items.length >= Project.MAX_GALLERY_ITEMS) return; draft.gallery.items.push({ id: Project.makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" }); renderGallery(); queueSave(); });
    $("#music-search").addEventListener("input", event => renderCatalog(event.target.value)); $("#music-upload").addEventListener("change", event => uploadAudio(event.target.files[0]));
    $("#previous-step").addEventListener("click", () => goToStep(currentStep - 1)); $("#next-step").addEventListener("click", () => { syncAll(); goToStep(currentStep + 1); }); $$("[data-step-target]").forEach(button => button.addEventListener("click", () => { syncAll(); goToStep(Number(button.dataset.stepTarget)); }));
    $("#gift-preview").addEventListener("load", () => setTimeout(sendPreview, 50)); $("#publish-button").addEventListener("click", publish); $("#copy-gift-url").addEventListener("click", () => giftUrl && navigator.clipboard.writeText(giftUrl)); $("#studio-retry").addEventListener("click", () => location.reload());
  }
  async function initialize() {
    if (!projectId) return setState("Link Studio tidak lengkap", "Project ID tidak ditemukan.", false);
    if (!token) return setState("Magic link tidak valid", "Buka kembali link Studio asli yang memiliki token.", false);
    try { const payload = await api.getStudio(); draft = Project.normalizeProject(payload.project, projectId); const isStaticLocal = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "3100"; giftUrl = isStaticLocal ? `${location.origin}/gift/index.html?project=${encodeURIComponent(projectId)}` : (payload.giftUrl || `${location.origin}/gift/${projectId}`); published = draft.status === "published"; catalog = await fetch("/assets/data/music.json").then(response => response.ok ? response.json() : []).catch(() => []); bind(); $("#gift-preview").src = isStaticLocal ? `/gift/index.html?project=${encodeURIComponent(projectId)}&preview=1` : `/gift/${encodeURIComponent(projectId)}?preview=1`; renderFields(); $("#studio-state").hidden = true; $("#studio-app").hidden = false; saveIndicator("saved"); } catch (error) { setState("Studio belum bisa dibuka", error.message, true); }
  }
  initialize();
})();
