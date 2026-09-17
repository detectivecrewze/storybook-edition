(function () {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const Project = window.StorybookProject;
  const Themes = window.StorybookThemes;
  const I18n = window.StorybookI18n;
  const Maps = window.StorybookMaps;
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
  let draftRevision = 0;
  let dragging = null;
  let catalog = [];
  let giftUrl = "";
  let published = false;
  const mediaDeliveryErrors = new Set();
  const CONTENT_PRESETS = Object.freeze({
    id: Object.freeze({
      reasons: Object.freeze({
        soft: Object.freeze(["Kamu membuat hari biasa terasa lebih hangat.", "Kamu selalu punya cara untuk membuatku merasa didengar.", "Hal-hal kecil bersamamu selalu terasa berarti.", "Aku bersyukur bisa mengenal dirimu yang apa adanya."]),
        playful: Object.freeze(["Bersamamu, cerita receh pun jadi kenangan favorit.", "Kamu selalu tahu cara mengubah hari yang membosankan jadi seru.", "Aku suka tawa dan keanehan kecil yang hanya kita mengerti.", "Setiap petualangan terasa lebih baik kalau ada kamu."]),
        admiration: Object.freeze(["Aku kagum pada cara kamu tetap kuat dalam banyak hal.", "Kamu membawa kebaikan ke orang-orang di sekitarmu.", "Kamu terus bertumbuh dengan caramu sendiri.", "Dunia terasa lebih baik karena kamu ada di dalamnya."])
      }),
      letter: Object.freeze({
        soft: Object.freeze({ greeting: "Untuk {recipient},", paragraphs: Object.freeze(["Aku membuat halaman kecil ini untuk menyimpan beberapa hal yang mungkin tidak selalu sempat kuucapkan. Terima kasih sudah menjadi dirimu sendiri dan hadir dalam banyak momen yang berarti.", "Semoga kamu selalu punya alasan untuk tersenyum, tempat untuk pulang, dan orang-orang yang mengingatkan bahwa kamu sangat berharga." ]), signoff: "Dengan penuh kasih,\n{sender}" }),
        celebrate: Object.freeze({ greeting: "Untuk {recipient},", paragraphs: Object.freeze(["Hari ini layak dirayakan, bukan hanya karena momennya, tetapi juga karena dirimu. Semua langkah kecil, keberanian, dan cerita yang kamu lewati pantas mendapat tempat istimewa.", "Semoga bab berikutnya membawa lebih banyak tawa, kesempatan baik, dan kenangan yang ingin kamu simpan selamanya." ]), signoff: "Untuk merayakanmu,\n{sender}" }),
        support: Object.freeze({ greeting: "Untuk {recipient},", paragraphs: Object.freeze(["Kalau hari-hari terasa panjang, ingatlah bahwa kamu tidak harus menjalaninya sendirian. Kamu sudah melangkah jauh, bahkan pada saat kamu mungkin tidak menyadarinya.", "Aku percaya pada kemampuanmu, caramu bertahan, dan semua hal baik yang sedang kamu perjuangkan. Pelan-pelan pun tidak apa-apa." ]), signoff: "Selalu mendukungmu,\n{sender}" })
      })
    }),
    en: Object.freeze({
      reasons: Object.freeze({
        soft: Object.freeze(["You make ordinary days feel warmer.", "You always make me feel heard.", "The smallest moments with you mean so much.", "I am grateful to know you exactly as you are."]),
        playful: Object.freeze(["Even silly stories become favorite memories with you.", "You always know how to make an ordinary day fun.", "I love the laughs and little quirks only we understand.", "Every adventure feels better with you there."]),
        admiration: Object.freeze(["I admire how you stay strong through so much.", "You bring kindness to everyone around you.", "You keep growing in your own remarkable way.", "The world feels better because you are in it."])
      }),
      letter: Object.freeze({
        soft: Object.freeze({ greeting: "Dear {recipient},", paragraphs: Object.freeze(["I made this little page to hold a few things I may not say often enough. Thank you for being yourself and for showing up in so many moments that matter.", "I hope you always have reasons to smile, a place that feels like home, and people who remind you how deeply valued you are." ]), signoff: "With all my love,\n{sender}" }),
        celebrate: Object.freeze({ greeting: "Dear {recipient},", paragraphs: Object.freeze(["Today deserves to be celebrated, not only because of the occasion, but because of you. Every small step, brave choice, and chapter you have lived deserves a special place.", "I hope the next chapter brings more laughter, wonderful opportunities, and memories you will want to keep forever." ]), signoff: "Celebrating you,\n{sender}" }),
        support: Object.freeze({ greeting: "Dear {recipient},", paragraphs: Object.freeze(["When the days feel long, remember that you do not have to carry everything alone. You have come so far, even on the days you may not notice it.", "I believe in your strength, your way of showing up, and every good thing you are working towards. Taking it slowly is still moving forward." ]), signoff: "Always cheering you on,\n{sender}" })
      })
    })
  });

  function setState(title, message, retry = false) { $("#studio-state strong").textContent = title; $("#studio-state p").textContent = message; $("#studio-retry").hidden = !retry; $("#studio-state").hidden = false; $("#studio-app").hidden = true; }
  function saveIndicator(state) { const node = $("#save-state"); node.className = `save-state is-${state}`; node.textContent = state === "saving" ? I18n.t("studio.saving") : state === "dirty" ? I18n.t("studio.unsaved") : I18n.t("studio.autosaved"); }
  function draftSnapshot() {
    // API requests must receive an immutable copy. Passing the live object lets a
    // late response resurrect an older project and erase an upload or typed text.
    return typeof structuredClone === "function" ? structuredClone(draft) : JSON.parse(JSON.stringify(draft));
  }
  function queueSave() { draftRevision += 1; clearTimeout(saveTimer); saveIndicator("dirty"); saveTimer = setTimeout(saveDraft, 650); sendPreview(); }
  function saveDraft() {
    clearTimeout(saveTimer); syncAll(); const requestRevision = draftRevision; const snapshot = draftSnapshot(); saveIndicator("saving");
    saveQueue = saveQueue.catch(() => {}).then(() => api.saveStudio(snapshot, "draft")).then(result => {
      // A response may arrive after a newer keystroke or upload. Never replace the
      // current draft with that stale server copy; the newer snapshot is queued.
      if (requestRevision !== draftRevision) { console.info("[Storybook Studio] Ignored stale draft save", { projectId, requestRevision, draftRevision }); return; }
      draft = Project.normalizeProject(result.project || snapshot, projectId, snapshot); saveIndicator("saved");
    }).catch(error => {
      if (requestRevision === draftRevision) saveIndicator("dirty");
      console.error("[Storybook Studio] Draft save failed", { projectId, status: error?.status, message: error?.message }, error);
    });
    return saveQueue;
  }
  function sendPreview() { syncAll(); const frame = $("#gift-preview"); if (frame?.contentWindow && draft) frame.contentWindow.postMessage({ type: "storybook-preview", project: draft }, location.origin); }
  function updateMediaDeliveryState(host, source, failed) {
    host.classList.toggle("is-error", failed);
    if (failed) mediaDeliveryErrors.add(source); else mediaDeliveryErrors.delete(source);
    const galleryCard = host.closest(".gallery-editor");
    const atlasCard = host.closest(".atlas-editor");
    const message = draft?.settings?.language === "en" ? "The file was saved, but its public media URL could not be opened. Check the Worker media domain." : "File tersimpan, tetapi URL media publiknya tidak dapat dibuka. Periksa domain media Worker.";
    if (galleryCard && failed) galleryUploadStatus(galleryCard, "error", message);
    if (atlasCard && failed) atlasUploadStatus(atlasCard, "error", message);
  }
  function setImagePreview(host, item) {
    host.replaceChildren(); host.classList.remove("is-error");
    if (!item.mediaUrl) { host.textContent = "MEDIA"; return; }
    const source = item.mediaUrl;
    if (mediaDeliveryErrors.has(source)) { host.textContent = "MEDIA BELUM TERSEDIA"; host.classList.add("is-error"); return; }
    const media = document.createElement(item.mediaType === "video" ? "video" : "img");
    if (item.mediaType === "video") { media.muted = true; media.playsInline = true; media.preload = "metadata"; }
    media.addEventListener("load", () => updateMediaDeliveryState(host, source, false), { once: true });
    media.addEventListener("loadeddata", () => updateMediaDeliveryState(host, source, false), { once: true });
    media.addEventListener("error", () => { host.replaceChildren(document.createTextNode("MEDIA BELUM TERSEDIA")); updateMediaDeliveryState(host, source, true); }, { once: true });
    media.src = source; host.append(media);
  }
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
    const host = $("#reasons-list"); host.replaceChildren(); draft.reasons.items.forEach((value, index) => { const fragment = $("#reason-template").content.cloneNode(true); const card = $("article", fragment); $(".field b", card).textContent = index + 1; const input = $("textarea", card); input.value = value; input.addEventListener("input", () => { draft.reasons.items[index] = input.value; queueSave(); }); $("[data-remove]", card).addEventListener("click", () => { if (draft.reasons.items.length <= Project.MIN_REASONS) return; syncAll(); draft.reasons.items.splice(index, 1); renderReasons(); queueSave(); }); $$("[data-move]", card).forEach(button => button.addEventListener("click", () => { syncAll(); swap(draft.reasons.items, index, button.dataset.move === "up" ? -1 : 1); renderReasons(); queueSave(); })); I18n.apply(card); host.append(fragment); }); dragSort(host, draft.reasons.items, () => { syncAll(); renderReasons(); });
  }
  function renderOpeningPanels() {
    const host = $("#opening-panel-grid"); host.replaceChildren();
    draft.opening.panelImages.forEach((source, index) => {
      const fragment = $("#opening-panel-template").content.cloneNode(true); const card = $("article", fragment); $("strong", card).textContent = `${I18n.t("studio.choosePhoto")} ${index + 1}`;
      const preview = $(".opening-panel-preview", card); if (source) { const image = document.createElement("img"); image.src = source; image.alt = `Opening panel ${index + 1}`; image.onerror = () => preview.replaceChildren(document.createTextNode("PHOTO")); preview.replaceChildren(image); }
      $(".opening-panel-file", card).addEventListener("change", event => { const file = event.target.files[0]; event.target.value = ""; uploadOpeningPanel(file, index); });
      $(".remove-opening-photo", card).hidden = !source; $(".remove-opening-photo", card).addEventListener("click", () => { draft.opening.panelImages[index] = ""; renderOpeningPanels(); queueSave(); });
      I18n.apply(card); host.append(fragment);
    });
  }
  function updateGalleryTitleUI(title) {
    const fallback = I18n.t("studio.gallery");
    const displayTitle = (typeof title === "string" && title.trim()) ? title : fallback;
    const heading = $("#gallery-step-heading");
    if (heading) heading.textContent = displayTitle;
    const navLabel = $("#gallery-step-nav-label");
    if (navLabel) navLabel.textContent = displayTitle;
  }
  function syncGalleryCard(item, card) {
    if (!item || !card) return;
    const title = $(".gallery-title", card);
    if (title) item.title = title.value.trim();
    const caption = $(".gallery-caption", card);
    if (caption) item.caption = caption.value.trim();
  }
  function renderGallery() {
    const galleryModule = draft?.modules?.find(module => module.type === "gallery");
    const moduleTitleInput = $("#gallery-module-title");
    const moduleSubtitleInput = $("#gallery-module-subtitle");
    if (moduleTitleInput && galleryModule) moduleTitleInput.value = galleryModule.title || "";
    if (moduleSubtitleInput && galleryModule) moduleSubtitleInput.value = galleryModule.subtitle || "";
    updateGalleryTitleUI(galleryModule?.title);
    const host = $("#gallery-list"); host.replaceChildren(); draft.gallery.items.forEach((item, index) => {
      const fragment = $("#gallery-template").content.cloneNode(true);
      const card = $("article", fragment);
      card.dataset.id = item.id;
      setImagePreview($(".media-preview", card), item);
      const titleInput = $(".gallery-title", card);
      const captionInput = $(".gallery-caption", card);
      titleInput.value = item.title;
      captionInput.value = item.caption;
      const getActiveItem = () => draft.gallery.items.find(entry => entry.id === item.id) || draft.gallery.items[index] || item;
      titleInput.addEventListener("input", event => {
        const current = getActiveItem();
        item.title = event.target.value;
        if (current) current.title = event.target.value;
        queueSave();
      });
      titleInput.addEventListener("blur", () => { syncAll(); queueSave(); });
      captionInput.addEventListener("input", event => {
        const current = getActiveItem();
        item.caption = event.target.value;
        if (current) current.caption = event.target.value;
        queueSave();
      });
      captionInput.addEventListener("blur", () => { syncAll(); queueSave(); });
      $(".gallery-file", card).addEventListener("change", event => {
        const file = event.target.files[0];
        event.target.value = "";
        syncGalleryCard(item, card);
        uploadGallery(file, item, card);
      });
      $("[data-remove]", card).addEventListener("click", () => {
        syncAll();
        draft.gallery.items.splice(index, 1);
        if (!draft.gallery.items.length) draft.gallery.items.push({ id: Project.makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" });
        renderGallery();
        queueSave();
      });
      $$("[data-move]", card).forEach(button => button.addEventListener("click", () => {
        syncAll();
        swap(draft.gallery.items, index, button.dataset.move === "up" ? -1 : 1);
        renderGallery();
        queueSave();
      }));
      I18n.apply(card);
      host.append(fragment);
    });
    dragSort(host, draft.gallery.items, () => { syncAll(); renderGallery(); });
  }
  function atlasStatus(location, state = "auto") {
    if (state === "short") return { kind: "invalid", text: I18n.t("studio.locationShortLink") };
    if (state === "invalid") return { kind: "invalid", text: I18n.t("studio.locationInvalid") };
    if (!Maps.validCoordinates(location.latitude, location.longitude)) return { kind: "idle", text: I18n.t("studio.locationEmpty") };
    if (!location.label) return { kind: "idle", text: draft.settings.language === "en" ? "Add the place name, then this location is ready." : "Isi nama tempat, lalu lokasi ini siap." };
    return { kind: "valid", text: `${I18n.t("studio.locationReady")}: ${Maps.formatCoordinates(location.latitude, location.longitude)}` };
  }
  function syncAtlasCard(location, card) {
    if (!location || !card) return;
    const label = $(".atlas-label", card);
    if (label) location.label = label.value.trim();
    const note = $(".atlas-note", card);
    if (note) location.note = note.value.trim();
    const locationInput = $(".atlas-location-input", card);
    if (locationInput) {
      const val = locationInput.value.trim();
      if (!val) {
        location.latitude = null; location.longitude = null; location.mapsUrl = "";
      } else {
        const res = Maps.extractCoordinates(val);
        if (res) {
          location.latitude = res.latitude; location.longitude = res.longitude;
          location.mapsUrl = Maps.canonicalGoogleMapsUrl(res.latitude, res.longitude);
        } else {
          location.mapsUrl = val;
        }
      }
    }
  }
  function renderAtlas() {
    const atlasModule = draft.modules.find(module => module.type === "atlas");
    const enabled = $("#atlas-enabled"); if (enabled) enabled.checked = Boolean(atlasModule?.enabled);
    const host = $("#atlas-list"); host.replaceChildren();
    draft.atlas.locations.forEach((location, index) => {
      const fragment = $("#atlas-template").content.cloneNode(true); const card = $("article", fragment);
      card.dataset.id = location.id;
      const label = $(".atlas-label", card); const locationInput = $(".atlas-location-input", card); const note = $(".atlas-note", card); const status = $(".atlas-status", card); const preview = $(".atlas-photo-preview", card); const removePhotoBtn = $(".remove-atlas-photo", card);
      const numEl = $(".atlas-index-num", card); if (numEl) numEl.textContent = String(index + 1);
      label.value = location.label; locationInput.value = Maps.validCoordinates(location.latitude, location.longitude) ? Maps.formatCoordinates(location.latitude, location.longitude) : location.mapsUrl; note.value = location.note;
      setImagePreview(preview, { mediaType: "image", mediaUrl: location.photoUrl });
      if (removePhotoBtn) removePhotoBtn.hidden = !location.photoUrl;
      const getActiveLocation = () => draft.atlas.locations.find(entry => entry.id === location.id) || draft.atlas.locations[index] || location;
      const updateStatus = state => { const loc = getActiveLocation(); const result = atlasStatus(loc, state); status.className = `atlas-status is-${result.kind}`; status.textContent = `${result.kind === "valid" ? "✓" : result.kind === "invalid" ? "!" : "i"} ${result.text}`; };
      label.addEventListener("input", event => { const loc = getActiveLocation(); location.label = event.target.value; if (loc) loc.label = event.target.value; updateStatus(); queueSave(); });
      label.addEventListener("blur", () => { const loc = getActiveLocation(); location.label = label.value.trim(); if (loc) loc.label = label.value.trim(); queueSave(); });
      note.addEventListener("input", event => { const loc = getActiveLocation(); location.note = event.target.value; if (loc) loc.note = event.target.value; queueSave(); });
      note.addEventListener("blur", () => { const loc = getActiveLocation(); location.note = note.value.trim(); if (loc) loc.note = note.value.trim(); queueSave(); });
      let resolveTimer = 0;
      const resolveLocation = (formatField = false) => {
        resolveTimer = 0; const value = locationInput.value.trim();
        const loc = getActiveLocation();
        if (!value) {
          location.latitude = null; location.longitude = null; location.mapsUrl = "";
          if (loc) { loc.latitude = null; loc.longitude = null; loc.mapsUrl = ""; }
          updateStatus(); queueSave(); return;
        }
        if (Maps.isShortMapsUrl(value)) {
          location.latitude = null; location.longitude = null; location.mapsUrl = value;
          if (loc) { loc.latitude = null; loc.longitude = null; loc.mapsUrl = value; }
          updateStatus("short"); queueSave(); return;
        }
        const result = Maps.extractCoordinates(value);
        if (!result) {
          location.latitude = null; location.longitude = null; location.mapsUrl = value;
          if (loc) { loc.latitude = null; loc.longitude = null; loc.mapsUrl = value; }
          updateStatus("invalid"); queueSave(); return;
        }
        location.latitude = result.latitude; location.longitude = result.longitude;
        location.mapsUrl = Maps.canonicalGoogleMapsUrl(result.latitude, result.longitude);
        if (loc) {
          loc.latitude = result.latitude; loc.longitude = result.longitude;
          loc.mapsUrl = Maps.canonicalGoogleMapsUrl(result.latitude, result.longitude);
        }
        if (formatField) locationInput.value = Maps.formatCoordinates(result.latitude, result.longitude);
        updateStatus(); queueSave();
      };
      locationInput.addEventListener("input", () => {
        const raw = locationInput.value.trim();
        const direct = Maps.extractCoordinates(raw);
        if (direct) {
          const loc = getActiveLocation();
          location.latitude = direct.latitude; location.longitude = direct.longitude;
          location.mapsUrl = Maps.canonicalGoogleMapsUrl(direct.latitude, direct.longitude);
          if (loc) {
            loc.latitude = direct.latitude; loc.longitude = direct.longitude;
            loc.mapsUrl = Maps.canonicalGoogleMapsUrl(direct.latitude, direct.longitude);
          }
          updateStatus();
        }
        clearTimeout(resolveTimer); resolveTimer = setTimeout(() => resolveLocation(false), 350);
      });
      locationInput.addEventListener("paste", () => { clearTimeout(resolveTimer); resolveTimer = setTimeout(() => resolveLocation(true), 0); });
      locationInput.addEventListener("blur", () => { clearTimeout(resolveTimer); resolveLocation(true); });
      $(".atlas-photo-file", card).addEventListener("change", event => {
        const file = event.target.files[0];
        event.target.value = "";
        clearTimeout(resolveTimer); resolveLocation(false);
        const loc = getActiveLocation();
        syncAtlasCard(loc, card);
        uploadAtlasPhoto(file, loc, card);
      });
      if (removePhotoBtn) {
        removePhotoBtn.addEventListener("click", () => {
          const loc = getActiveLocation();
          location.photoUrl = "";
          if (loc) loc.photoUrl = "";
          removePhotoBtn.hidden = true;
          setImagePreview(preview, { mediaType: "image", mediaUrl: "" });
          atlasUploadStatus(card, "");
          queueSave(); sendPreview();
        });
      }
      $("[data-remove]", card).addEventListener("click", () => {
        syncAll();
        const currentIndex = draft.atlas.locations.findIndex(entry => entry.id === location.id);
        const targetIndex = currentIndex >= 0 ? currentIndex : index;
        draft.atlas.locations.splice(targetIndex, 1);
        renderAtlas(); queueSave();
      });
      $$("[data-move]", card).forEach(button => button.addEventListener("click", () => {
        syncAll();
        const currentIndex = draft.atlas.locations.findIndex(entry => entry.id === location.id);
        const targetIndex = currentIndex >= 0 ? currentIndex : index;
        swap(draft.atlas.locations, targetIndex, button.dataset.move === "up" ? -1 : 1);
        renderAtlas(); queueSave();
      }));
      updateStatus(); I18n.apply(card); host.append(fragment);
    });
    dragSort(host, draft.atlas.locations, () => { syncAll(); renderAtlas(); });
  }
  function renderMusic() {
    const host = $("#music-list"); host.replaceChildren(); draft.music.tracks.forEach((track, index) => {
      const fragment = $("#track-template").content.cloneNode(true); const card = $("article", fragment);
      $(".track-cover", card).style.backgroundImage = track.coverUrl ? `url('${track.coverUrl}')` : "";
      const titleInput = $(".track-title", card); const artistInput = $(".track-artist", card);
      titleInput.value = track.title; artistInput.value = track.artist;
      const getActiveTrack = () => draft.music.tracks.find(entry => entry.id === track.id) || draft.music.tracks[index] || track;
      titleInput.addEventListener("input", event => { const current = getActiveTrack(); track.title = event.target.value; if (current) current.title = event.target.value; queueSave(); });
      artistInput.addEventListener("input", event => { const current = getActiveTrack(); track.artist = event.target.value; if (current) current.artist = event.target.value; queueSave(); });
      $("[data-remove]", card).addEventListener("click", () => { syncAll(); draft.music.tracks.splice(index, 1); renderMusic(); queueSave(); });
      I18n.apply(card); host.append(fragment);
    });
  }
  function renderCatalog(filter = "") { const host = $("#music-catalog"); host.replaceChildren(); const query = filter.trim().toLowerCase(); catalog.filter(track => !query || `${track.title} ${track.artist}`.toLowerCase().includes(query)).slice(0, 30).forEach(track => { const button = document.createElement("button"); button.type = "button"; button.className = "catalog-track"; button.innerHTML = `<img alt=""><span><strong></strong><small></small></span>`; $("img", button).src = track.coverUrl; $("strong", button).textContent = track.title; $("small", button).textContent = track.artist; button.addEventListener("click", () => { if (draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS || draft.music.tracks.some(item => item.audioUrl === track.audioUrl)) return; draft.music.tracks.push({ id: track.id || Project.makeId("track"), sourceType: "catalog", catalogId: track.id || "", audioUrl: track.audioUrl, coverUrl: track.coverUrl || "", title: track.title, artist: track.artist || "" }); renderMusic(); queueSave(); }); host.append(button); }); }
  function renderModules() {
    const host = $("#module-editor"); host.replaceChildren(); draft.modules.sort((a, b) => a.order - b.order).forEach((module, index) => {
      const fragment = $("#module-template").content.cloneNode(true);
      const row = $("article", fragment);
      row.dataset.type = module.type;
      const toggle = $(".module-enabled", row);
      toggle.checked = module.enabled;
      const titleInput = $(".module-title", row);
      const subtitleInput = $(".module-subtitle", row);
      titleInput.value = module.title;
      subtitleInput.value = module.subtitle;
      toggle.addEventListener("change", () => {
        module.enabled = toggle.checked;
        if (module.type === "atlas") {
          const atlasToggle = $("#atlas-enabled");
          if (atlasToggle) atlasToggle.checked = module.enabled;
        }
        console.info("[Storybook Studio] Module changed", { projectId, module: module.type, enabled: module.enabled });
        queueSave();
      });
      titleInput.addEventListener("input", event => {
        module.title = event.target.value;
        if (module.type === "gallery") {
          const stepTitle = $("#gallery-module-title");
          if (stepTitle && stepTitle.value !== event.target.value) stepTitle.value = event.target.value;
          updateGalleryTitleUI(event.target.value);
        }
        queueSave();
      });
      subtitleInput.addEventListener("input", event => {
        module.subtitle = event.target.value;
        if (module.type === "gallery") {
          const stepSubtitle = $("#gallery-module-subtitle");
          if (stepSubtitle && stepSubtitle.value !== event.target.value) stepSubtitle.value = event.target.value;
        }
        queueSave();
      });
      $$("[data-move]", row).forEach(button => button.addEventListener("click", () => {
        swap(draft.modules, index, button.dataset.move === "up" ? -1 : 1);
        draft.modules.forEach((item, order) => item.order = order);
        renderModules();
        queueSave();
      }));
      I18n.apply(row);
      host.append(fragment);
    });
    dragSort(host, draft.modules, () => {
      draft.modules.forEach((item, order) => item.order = order);
      renderModules();
    });
  }
  function renderFields() {
    I18n.setLocale(draft.settings.language); I18n.apply(); $("#studio-language").value = draft.settings.language; renderThemes(); renderOccasions();
    $("#recipient").value = draft.identity.recipient; $("#sender").value = draft.identity.sender; $("#event-date").value = draft.identity.eventDate;
    $("#opening-eyebrow").value = draft.opening.eyebrow; $("#opening-title").value = draft.opening.title; $("#opening-message").value = draft.opening.message; renderOpeningPanels();
    renderReasons(); renderGallery(); renderAtlas(); renderMusic(); renderCatalog($("#music-search").value); $("#letter-greeting").value = draft.letter.greeting; $("#letter-body").value = draft.letter.paragraphs.join("\n\n"); $("#letter-signoff").value = draft.letter.signoff;
    renderModules(); $("#finale-title").value = draft.finale.title; $("#finale-message").value = draft.finale.message; $("#finale-signoff").value = draft.finale.signoff; updateGiftResult(); goToStep(currentStep, false); sendPreview();
  }
  function syncAll() {
    if (!draft) return; draft.identity.recipient = $("#recipient").value; draft.identity.sender = $("#sender").value; draft.identity.eventDate = $("#event-date").value;
    draft.opening.eyebrow = $("#opening-eyebrow").value; draft.opening.title = $("#opening-title").value; draft.opening.message = $("#opening-message").value;
    draft.letter.greeting = $("#letter-greeting").value; draft.letter.paragraphs = $("#letter-body").value.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean); draft.letter.signoff = $("#letter-signoff").value;
    draft.finale.title = $("#finale-title").value; draft.finale.message = $("#finale-message").value; draft.finale.signoff = $("#finale-signoff").value;
    const galleryModule = draft.modules?.find(module => module.type === "gallery");
    if (galleryModule) {
      const titleInput = $("#gallery-module-title");
      if (titleInput && titleInput.value !== undefined) galleryModule.title = titleInput.value;
      const subtitleInput = $("#gallery-module-subtitle");
      if (subtitleInput && subtitleInput.value !== undefined) galleryModule.subtitle = subtitleInput.value;
    }
    $$(".gallery-editor", $("#gallery-list")).forEach((card, index) => {
      const item = draft.gallery.items.find(entry => entry.id === card.dataset.id) || draft.gallery.items[index];
      if (item) syncGalleryCard(item, card);
    });
    $$(".reason-editor", $("#reasons-list")).forEach((card, index) => {
      const textarea = $("textarea", card);
      if (textarea && draft.reasons.items[index] !== undefined) {
        draft.reasons.items[index] = textarea.value.trim();
      }
    });
    $$(".track-editor", $("#music-list")).forEach((card, index) => {
      const track = draft.music.tracks[index];
      if (!track) return;
      const title = $(".track-title", card);
      if (title) track.title = title.value.trim();
      const artist = $(".track-artist", card);
      if (artist) track.artist = artist.value.trim();
    });
    $$(".atlas-editor", $("#atlas-list")).forEach((card, index) => {
      const loc = draft.atlas.locations.find(entry => entry.id === card.dataset.id) || draft.atlas.locations[index];
      if (loc) syncAtlasCard(loc, card);
    });
  }
  function presetText(value) {
    const recipient = draft.identity.recipient.trim() || (draft.settings.language === "en" ? "someone special" : "seseorang spesial");
    const sender = draft.identity.sender.trim() || (draft.settings.language === "en" ? "someone who cares" : "seseorang yang menyayangimu");
    return String(value || "").replaceAll("{recipient}", recipient).replaceAll("{sender}", sender);
  }
  function applyReasonsPreset(key) {
    syncAll(); const source = CONTENT_PRESETS[draft.settings.language]?.reasons?.[key];
    if (!source) return; draft.reasons.items = source.map(presetText); renderReasons(); queueSave();
  }
  function applyLetterPreset(key) {
    syncAll(); const source = CONTENT_PRESETS[draft.settings.language]?.letter?.[key];
    if (!source) return; draft.letter = { greeting: presetText(source.greeting), paragraphs: source.paragraphs.map(presetText), signoff: presetText(source.signoff) };
    $("#letter-greeting").value = draft.letter.greeting; $("#letter-body").value = draft.letter.paragraphs.join("\n\n"); $("#letter-signoff").value = draft.letter.signoff; queueSave();
  }
  function reportUploadError(label, error) {
    console.error("[Storybook Studio] Upload flow failed", { projectId, label, status: error?.status, message: error?.message }, error);
    const message = error?.message || "Terjadi kesalahan yang tidak diketahui.";
    alert(`${label} gagal diupload. ${message}\n\nBuka Console browser untuk detail error.`);
  }
  function goToStep(step, scroll = true) { currentStep = Math.max(1, Math.min(9, step)); $$(".wizard-step").forEach(node => node.classList.toggle("is-active", Number(node.dataset.step) === currentStep)); $$("#step-list li").forEach(node => node.classList.toggle("is-active", Number($("button", node).dataset.stepTarget) === currentStep)); $("#previous-step").disabled = currentStep === 1; $("#next-step").hidden = currentStep === 9; $("#step-progress").textContent = `${currentStep} / 9`; $("#progress-fill").style.width = `${currentStep / 9 * 100}%`; if (currentStep === 9) sendPreview(); if (scroll) scrollTo({ top: 0, behavior: "smooth" }); }
  function clearErrors() { $$('[data-error]').forEach(node => node.textContent = ""); }
  function showErrors(errors) { clearErrors(); Object.entries(errors).forEach(([key, value]) => { const node = $(`[data-error='${key}']`); if (node) node.textContent = value; }); const stepMap = { recipient: 1, sender: 1, reasons: 3, gallery: 4, atlas: 5, music: 6, letter: 7, modules: 8 }; const first = Object.keys(errors)[0]; if (first) goToStep(stepMap[first] || 1); }
  function webpFile(canvas, file, quality) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`, { type: "image/webp" })) : reject(new Error("Foto tidak dapat dikonversi. Coba gunakan JPG, PNG, atau WEBP lain.")), "image/webp", quality)); }
  async function withOriginalImageFallback(file, operation) {
    try { return await operation(); }
    catch (error) {
      console.warn("[Storybook Studio] WebP conversion skipped; uploading the original image", { projectId, name: file?.name, type: file?.type, message: error?.message });
      return file;
    }
  }
  async function imageWebp(file) { return withOriginalImageFallback(file, async () => { const bitmap = await createImageBitmap(file); try { const targetRatio = 4 / 3; let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height; if (sw / sh > targetRatio) { sw = sh * targetRatio; sx = (bitmap.width - sw) / 2; } else { sh = sw / targetRatio; sy = (bitmap.height - sh) / 2; } const width = Math.min(1600, Math.round(sw)); const height = Math.round(width / targetRatio); const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const context = canvas.getContext("2d"); if (!context) throw new Error("Foto tidak dapat diproses oleh browser ini."); context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height); return await webpFile(canvas, file, .86); } finally { bitmap.close(); } }); }
  async function imageWebpPreserve(file) { return withOriginalImageFallback(file, async () => { const bitmap = await createImageBitmap(file); try { const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)); const width = Math.max(1, Math.round(bitmap.width * scale)); const height = Math.max(1, Math.round(bitmap.height * scale)); const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const context = canvas.getContext("2d"); if (!context) throw new Error("Foto tidak dapat diproses oleh browser ini."); context.drawImage(bitmap, 0, 0, width, height); return await webpFile(canvas, file, .78); } finally { bitmap.close(); } }); }

  let photoCropper = null;
  let pendingPhotoCrop = null;
  let cropZoomValue = 0;
  let cropRotation = 0;

  function closePhotoCropper() {
    if (photoCropper) {
      try { photoCropper.destroy(); } catch {}
    }
    photoCropper = null;
    if (pendingPhotoCrop?.objectUrl) URL.revokeObjectURL(pendingPhotoCrop.objectUrl);
    cropZoomValue = 0;
    cropRotation = 0;
    const source = $("#cropper-source");
    if (source) source.removeAttribute("src");
    const errorBox = $("#cropper-error");
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }
    const zoomSlider = $("#cropper-zoom");
    if (zoomSlider) zoomSlider.value = "0";
    const dialog = $("#photo-crop-dialog");
    if (dialog && dialog.open) dialog.close();
  }

  function cancelPhotoCrop() {
    const resolve = pendingPhotoCrop?.resolve;
    closePhotoCropper();
    pendingPhotoCrop = null;
    if (resolve) resolve(null);
  }

  async function applyDefaultCropZoom() {
    if (!photoCropper) return;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const image = photoCropper.getCropperImage();
    const selection = photoCropper.getCropperSelection();
    if (!image || !selection) return;
    const imageRect = image.getBoundingClientRect();
    const selectionRect = selection.getBoundingClientRect();
    const coverScale = Math.max(
      selectionRect.width / Math.max(1, imageRect.width),
      selectionRect.height / Math.max(1, imageRect.height)
    );
    const zoomAmount = Math.min(1, Math.max(.25, coverScale - 1 + .04));
    image.$zoom(zoomAmount);
    cropZoomValue = Math.round(zoomAmount * 100);
    const zoomSlider = $("#cropper-zoom");
    if (zoomSlider) zoomSlider.value = String(cropZoomValue);
  }

  async function resetPhotoCropper() {
    if (!photoCropper || !pendingPhotoCrop) return;
    photoCropper.getCropperImage()?.$resetTransform();
    const selection = photoCropper.getCropperSelection();
    if (selection) {
      selection.aspectRatio = pendingPhotoCrop.aspectRatio;
      selection.initialAspectRatio = pendingPhotoCrop.aspectRatio;
      selection.initialCoverage = 0.82;
      selection.$reset();
    }
    cropZoomValue = 0;
    cropRotation = 0;
    const zoomSlider = $("#cropper-zoom");
    if (zoomSlider) zoomSlider.value = "0";
    await applyDefaultCropZoom();
  }

  async function confirmPhotoCrop() {
    if (!photoCropper || !pendingPhotoCrop) return;
    const confirmButton = $("#confirm-photo-crop");
    const errorBox = $("#cropper-error");
    if (confirmButton) {
      confirmButton.disabled = true;
      confirmButton.dataset.originalText = confirmButton.textContent;
      confirmButton.textContent = I18n.t("studio.cropPreparing") || "Menyiapkan foto...";
    }
    if (errorBox) errorBox.hidden = true;
    try {
      const selection = photoCropper.getCropperSelection();
      if (!selection) throw new Error("Area crop belum siap.");
      const source = $("#cropper-source");
      const cropperImage = photoCropper.getCropperImage();
      const swapDimensions = Math.abs(cropRotation / 90) % 2 === 1;
      const naturalWidth = swapDimensions ? source.naturalHeight : source.naturalWidth;
      const naturalHeight = swapDimensions ? source.naturalWidth : source.naturalHeight;
      const baseWidth = Math.max(1, swapDimensions ? cropperImage?.clientHeight || 1 : cropperImage?.clientWidth || 1);
      const [matrixA = 1, matrixB = 0] = cropperImage?.$getTransform?.() || [];
      const transformScale = Math.max(.0001, Math.hypot(matrixA, matrixB));
      const selectedSourceWidth = selection.width * (naturalWidth / baseWidth) / transformScale;
      const targetRatio = Number(pendingPhotoCrop.aspectRatio) || (4 / 3);
      const largestCropWidth = targetRatio === 1
        ? Math.max(1, Math.min(naturalWidth, naturalHeight, selectedSourceWidth))
        : Math.max(1, Math.min(naturalWidth, naturalHeight * targetRatio, selectedSourceWidth));
      const outputWidth = Math.max(1, Math.min(targetRatio === 1 ? 1200 : 1600, Math.round(largestCropWidth)));
      const outputHeight = Math.max(1, Math.min(1200, Math.round(outputWidth / targetRatio)));
      const canvas = await selection.$toCanvas({
        width: outputWidth,
        height: outputHeight,
        beforeDraw(context, outputCanvas) {
          context.fillStyle = "#fffdf8";
          context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
        }
      });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Gagal mengonversi foto")), "image/webp", .86);
      });
      const { file, resolve } = pendingPhotoCrop;
      const croppedFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}-cropped.webp`, { type: "image/webp" });
      closePhotoCropper();
      if (resolve) resolve(croppedFile);
    } catch (error) {
      console.error("[Storybook Studio] Crop failed", error);
      if (errorBox) {
        errorBox.textContent = error.message || I18n.t("studio.cropError") || "Foto gagal dipotong.";
        errorBox.hidden = false;
      }
    } finally {
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = confirmButton.dataset.originalText || I18n.t("studio.cropUse") || "Gunakan foto";
      }
    }
  }

  async function openPhotoCropper(file, { aspectRatio = 4 / 3, title = "", description = "" } = {}) {
    const CropperConstructor = window.Cropper?.default || window.Cropper;
    if (typeof CropperConstructor !== "function") {
      console.warn("[Storybook Studio] Cropper constructor not available, using raw file");
      return file;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert(I18n.t("studio.maxImage"));
      return null;
    }
    closePhotoCropper();
    return new Promise(async (resolve) => {
      const dialog = $("#photo-crop-dialog");
      if (!dialog) return resolve(file);
      const source = $("#cropper-source");
      const titleEl = $("#photo-crop-title");
      const descEl = $("#photo-crop-description");
      if (titleEl) titleEl.textContent = title || I18n.t("studio.cropTitle") || "Pilih bagian terbaiknya";
      if (descEl) descEl.textContent = description || (aspectRatio === 1 ? (I18n.t("studio.cropOpeningDesc") || "Area terang berasio 1:1 adalah bagian yang akan tampil di panel Opening.") : (I18n.t("studio.cropGalleryDesc") || "Area terang berasio 4:3 adalah bagian yang akan tampil di dalam cerita."));
      I18n.apply(dialog);
      const objectUrl = URL.createObjectURL(file);
      pendingPhotoCrop = { file, objectUrl, aspectRatio, resolve };
      source.src = objectUrl;
      dialog.showModal();
      try {
        await source.decode();
        if (!pendingPhotoCrop || pendingPhotoCrop.objectUrl !== objectUrl) return;
        photoCropper = new CropperConstructor(source, { container: $("#cropper-stage") });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const selection = photoCropper.getCropperSelection();
        if (!selection) throw new Error("Crop selection element not ready");
        selection.aspectRatio = aspectRatio;
        selection.initialAspectRatio = aspectRatio;
        selection.initialCoverage = 0.82;
        selection.$reset();
        await applyDefaultCropZoom();
      } catch (error) {
        console.error("[Storybook Studio] Cropper error during initialization", error);
        const errorBox = $("#cropper-error");
        if (errorBox) {
          errorBox.textContent = error.message || I18n.t("studio.cropError") || "Gagal memuat foto ke cropper.";
          errorBox.hidden = false;
        }
      }
    });
  }

  function openCropperModal(file, options) {
    return openPhotoCropper(file, options);
  }

  async function uploadOpeningPanel(file, index) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return alert(I18n.t("studio.maxImage"));
    const cropped = await openCropperModal(file, { aspectRatio: 1, title: I18n.t("studio.cropOpening") || "Sesuaikan Foto Opening" });
    if (!cropped) return;
    try {
      console.info("[Storybook Studio] Preparing opening panel", { projectId, panel: index + 1, size: cropped.size, type: cropped.type });
      const result = await api.upload(cropped, "photo");
      draft.opening.panelImages[index] = result.url;
      renderOpeningPanels(); queueSave();
    } catch (error) {
      reportUploadError("Foto opening", error); renderOpeningPanels();
    }
  }
  function galleryUploadStatus(card, state, message = "") { const status = $(".gallery-upload-status", card); const input = $(".gallery-file", card); if (status) { status.className = `gallery-upload-status${state ? ` is-${state}` : ""}`; status.textContent = message; } if (input) input.disabled = state === "uploading"; }
  function atlasUploadStatus(card, state, message = "") { const status = $(".atlas-upload-status", card); const input = $(".atlas-photo-file", card); if (status) { status.className = `atlas-upload-status${state ? ` is-${state}` : ""}`; status.textContent = message; } if (input) input.disabled = state === "uploading"; }
  function mediaKind(file) { const type = String(file?.type || "").toLowerCase(); const extension = String(file?.name || "").split(".").pop()?.toLowerCase(); if (type.startsWith("video/") || ["mp4", "webm", "mov"].includes(extension)) return "video"; if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type) || ["jpg", "jpeg", "png", "webp"].includes(extension)) return "photo"; return ""; }
  async function uploadGallery(file, item, card) {
    if (!file) return;
    syncGalleryCard(item, card);
    const kind = mediaKind(file);
    if (!kind) { galleryUploadStatus(card, "error", "Gunakan foto JPG/PNG/WEBP atau video MP4/WEBM/MOV."); return; }
    const isVideo = kind === "video"; const max = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > max) { galleryUploadStatus(card, "error", I18n.t(isVideo ? "studio.maxVideo" : "studio.maxImage")); return; }
    syncGalleryCard(item, card);
    const itemId = item.id;
    let uploadFile;
    if (isVideo) {
      uploadFile = file;
    } else {
      const cropped = await openCropperModal(file, { aspectRatio: 4 / 3, title: I18n.t("studio.cropGallery") || "Sesuaikan Foto Galeri" });
      if (!cropped) return;
      uploadFile = cropped;
    }
    syncGalleryCard(item, card);
    galleryUploadStatus(card, "uploading", I18n.t("studio.preparingMedia"));
    try {
      console.info("[Storybook Studio] Preparing gallery media", { projectId, itemId, mediaType: kind, size: uploadFile.size, type: uploadFile.type });
      galleryUploadStatus(card, "uploading", I18n.t("studio.savingMedia"));
      const result = await api.upload(uploadFile, kind);
      if (!result?.url) throw new Error("Server tidak mengembalikan URL media.");
      const currentItem = draft.gallery.items.find(entry => entry.id === itemId);
      if (!currentItem) return;
      syncGalleryCard(currentItem, card);
      mediaDeliveryErrors.delete(result.url); currentItem.mediaType = isVideo ? "video" : "image"; currentItem.mediaUrl = result.url;
      setImagePreview($(".media-preview", card), currentItem);
      galleryUploadStatus(card, "ready", I18n.t("studio.mediaUploaded") || "Media berhasil diunggah");
      queueSave(); sendPreview();
    } catch (error) {
      galleryUploadStatus(card, "error", error?.message || "Media tidak berhasil diupload.");
      reportUploadError(isVideo ? "Video galeri" : "Foto galeri", error);
    }
  }
  async function uploadAtlasPhoto(file, location, card) {
    if (!file) return;
    if (mediaKind(file) !== "photo") { atlasUploadStatus(card, "error", I18n.t("studio.imageOnly")); return; }
    if (file.size > 8 * 1024 * 1024) { atlasUploadStatus(card, "error", I18n.t("studio.maxImage")); return; }
    syncAtlasCard(location, card);
    const cropped = await openCropperModal(file, { aspectRatio: 4 / 3, title: I18n.t("studio.cropAtlas") || "Sesuaikan Foto Lokasi" });
    if (!cropped) return;
    syncAtlasCard(location, card);

    const atlasModule = draft.modules.find(entry => entry.type === "atlas");
    if (atlasModule && !atlasModule.enabled) {
      atlasModule.enabled = true;
      const atlasToggle = $("#atlas-enabled");
      if (atlasToggle) atlasToggle.checked = true;
      renderModules();
    }

    const locationId = location.id;
    atlasUploadStatus(card, "uploading", I18n.t("studio.preparingMedia"));
    try {
      console.info("[Storybook Studio] Preparing map photo", { projectId, size: cropped.size, type: cropped.type });
      atlasUploadStatus(card, "uploading", I18n.t("studio.savingMedia"));
      const result = await api.upload(cropped, "photo");
      if (!result?.url) throw new Error("Server tidak mengembalikan URL media.");
      const currentLocation = draft.atlas.locations.find(entry => entry.id === locationId);
      if (!currentLocation) return;
      mediaDeliveryErrors.delete(result.url);
      currentLocation.photoUrl = result.url;
      setImagePreview($(".atlas-photo-preview", card), { mediaType: "image", mediaUrl: result.url });
      const removeBtn = $(".remove-atlas-photo", card);
      if (removeBtn) removeBtn.hidden = false;
      atlasUploadStatus(card, "ready", I18n.t("studio.photoUploaded") || "Foto berhasil diunggah");
      queueSave(); sendPreview();
    } catch (error) {
      atlasUploadStatus(card, "error", error?.message || I18n.t("studio.uploadFailed"));
      reportUploadError("Foto lokasi", error);
    }
  }
  async function uploadAudio(file) { if (!file) return; if (draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS) return alert(I18n.t("studio.maxTracks")); if (file.size > 20 * 1024 * 1024) return alert(I18n.t("studio.maxAudio")); try { console.info("[Storybook Studio] Preparing audio", { projectId, size: file.size, type: file.type }); const result = await api.upload(file, "audio"); draft.music.tracks.push({ id: Project.makeId("track"), sourceType: "upload", catalogId: "", audioUrl: result.url, coverUrl: "", title: file.name.replace(/\.[^.]+$/, ""), artist: "" }); renderMusic(); queueSave(); } catch (error) { reportUploadError("Audio", error); } }
  function updateGiftResult() { $("#gift-url").value = giftUrl; $("#open-public-gift").href = giftUrl || "#"; $("#publish-note").textContent = published ? I18n.t("studio.published") : I18n.t("studio.publishHint"); const host = $("#qr-code"); host.replaceChildren(); if (giftUrl && window.QRCode) new QRCode(host, { text: giftUrl, width: 150, height: 150, colorDark: "#17191f", colorLight: "#fffaf0" }); }
  async function publish() { syncAll(); const validation = Project.validateProject(draft, { forPublish: true }); if (!validation.valid) return showErrors(validation.errors); clearErrors(); const button = $("#publish-button"); button.disabled = true; button.textContent = I18n.t("studio.publishing"); try { await saveQueue.catch(() => {}); const result = await api.saveStudio(validation.project, "published"); draft = Project.normalizeProject(result.project || validation.project, projectId, draft); giftUrl = result.giftUrl || giftUrl; published = true; saveIndicator("saved"); updateGiftResult(); sendPreview(); } catch (error) { alert(error.message); } finally { button.disabled = false; button.textContent = I18n.t("studio.publishButton"); } }

  function bind() {
    $("#studio-retry").addEventListener("click", () => location.reload());
    $("#studio-form").addEventListener("input", event => { if (event.target.closest("#opening-panel-grid,#reasons-list,#gallery-list,#atlas-list,#music-list,#module-editor")) return; syncAll(); queueSave(); });
    $("#studio-language").addEventListener("change", event => { syncAll(); Project.changeLanguage(draft, event.target.value); renderFields(); queueSave(); });
    $("#occasion-preset").addEventListener("change", event => { if (!confirm(I18n.t("studio.presetWarning"))) { event.target.value = draft.occasionPreset; return; } syncAll(); draft = Project.applyOccasionPreset(draft, event.target.value); renderFields(); queueSave(); });
    $$('[data-reasons-preset]').forEach(button => button.addEventListener("click", () => applyReasonsPreset(button.dataset.reasonsPreset)));
    $$('[data-letter-preset]').forEach(button => button.addEventListener("click", () => applyLetterPreset(button.dataset.letterPreset)));
    $("#add-reason").addEventListener("click", () => { if (draft.reasons.items.length >= Project.MAX_REASONS) return; syncAll(); draft.reasons.items.push(""); renderReasons(); queueSave(); });
    $("#add-gallery").addEventListener("click", () => { if (draft.gallery.items.length >= Project.MAX_GALLERY_ITEMS) return; syncAll(); draft.gallery.items.push({ id: Project.makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" }); renderGallery(); queueSave(); });
    const galleryTitleInput = $("#gallery-module-title");
    if (galleryTitleInput) {
      galleryTitleInput.addEventListener("input", event => {
        const galleryModule = draft?.modules?.find(module => module.type === "gallery");
        if (galleryModule) galleryModule.title = event.target.value;
        updateGalleryTitleUI(event.target.value);
        const moduleRowInput = $("#module-editor [data-type='gallery'] .module-title");
        if (moduleRowInput && moduleRowInput.value !== event.target.value) moduleRowInput.value = event.target.value;
      });
      galleryTitleInput.addEventListener("blur", () => { syncAll(); queueSave(); });
    }
    const gallerySubtitleInput = $("#gallery-module-subtitle");
    if (gallerySubtitleInput) {
      gallerySubtitleInput.addEventListener("input", event => {
        const galleryModule = draft?.modules?.find(module => module.type === "gallery");
        if (galleryModule) galleryModule.subtitle = event.target.value;
        const moduleRowInput = $("#module-editor [data-type='gallery'] .module-subtitle");
        if (moduleRowInput && moduleRowInput.value !== event.target.value) moduleRowInput.value = event.target.value;
      });
      gallerySubtitleInput.addEventListener("blur", () => { syncAll(); queueSave(); });
    }
    $("#atlas-enabled").addEventListener("change", event => { const module = draft.modules.find(item => item.type === "atlas"); if (!module) return; module.enabled = event.target.checked; console.info("[Storybook Studio] Module changed", { projectId, module: "atlas", enabled: module.enabled }); renderModules(); queueSave(); });
    $("#add-atlas").addEventListener("click", () => {
      syncAll();
      if (draft.atlas.locations.length >= Project.MAX_ATLAS_LOCATIONS) return;
      const atlasModule = draft.modules.find(item => item.type === "atlas");
      if (atlasModule && !atlasModule.enabled) {
        atlasModule.enabled = true;
        const atlasToggle = $("#atlas-enabled");
        if (atlasToggle) atlasToggle.checked = true;
        renderModules();
      }
      draft.atlas.locations.push({ id: Project.makeId("location"), label: "", latitude: null, longitude: null, mapsUrl: "", photoUrl: "", note: "" });
      renderAtlas();
      queueSave();
    });
    $("#music-search").addEventListener("input", event => renderCatalog(event.target.value)); $("#music-upload").addEventListener("change", event => { const file = event.target.files[0]; event.target.value = ""; uploadAudio(file); });
    $("#previous-step").addEventListener("click", () => goToStep(currentStep - 1)); $("#next-step").addEventListener("click", () => { syncAll(); goToStep(currentStep + 1); }); $$("[data-step-target]").forEach(button => button.addEventListener("click", () => { syncAll(); goToStep(Number(button.dataset.stepTarget)); }));
    $("#gift-preview").addEventListener("load", () => setTimeout(sendPreview, 50)); $("#publish-button").addEventListener("click", publish); $("#copy-gift-url").addEventListener("click", () => giftUrl && navigator.clipboard.writeText(giftUrl)); $("#studio-retry").addEventListener("click", () => location.reload());
    $("#close-photo-crop")?.addEventListener("click", cancelPhotoCrop);
    $("#cancel-photo-crop")?.addEventListener("click", cancelPhotoCrop);
    $("#confirm-photo-crop")?.addEventListener("click", confirmPhotoCrop);
    const cropDialog = $("#photo-crop-dialog");
    if (cropDialog) {
      cropDialog.addEventListener("cancel", event => {
        event.preventDefault();
        cancelPhotoCrop();
      });
      cropDialog.addEventListener("click", event => {
        if (event.target === cropDialog) cancelPhotoCrop();
      });
    }
    $$("[data-crop-action]").forEach(button => button.addEventListener("click", () => {
      if (!photoCropper) return;
      if (button.dataset.cropAction === "reset") return resetPhotoCropper();
      const degrees = button.dataset.cropAction === "rotate-left" ? -90 : 90;
      photoCropper.getCropperImage()?.$rotate(`${degrees}deg`);
      cropRotation = (cropRotation + degrees) % 360;
    }));
    const zoomSlider = $("#cropper-zoom");
    if (zoomSlider) {
      zoomSlider.addEventListener("input", event => {
        if (!photoCropper) return;
        const nextZoomValue = Number(event.target.value);
        photoCropper.getCropperImage()?.$zoom((nextZoomValue - cropZoomValue) / 100);
        cropZoomValue = nextZoomValue;
      });
    }
  }
  async function initialize() {
    if (!projectId) return setState("Link Studio tidak lengkap", "Project ID tidak ditemukan.", false);
    if (!token) return setState("Magic link tidak valid", "Buka kembali link Studio asli yang memiliki token.", false);
    try { const payload = await api.getStudio(); draft = Project.normalizeProject(payload.project, projectId); const isStaticLocal = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "3100"; giftUrl = isStaticLocal ? `${location.origin}/gift/index.html?project=${encodeURIComponent(projectId)}` : (payload.giftUrl || `${location.origin}/gift/${projectId}`); published = draft.status === "published"; catalog = await fetch("/assets/data/music.json").then(response => response.ok ? response.json() : []).catch(() => []); bind(); $("#gift-preview").src = isStaticLocal ? `/gift/index.html?project=${encodeURIComponent(projectId)}&preview=1` : `/gift/${encodeURIComponent(projectId)}?preview=1`; renderFields(); $("#studio-state").hidden = true; $("#studio-app").hidden = false; saveIndicator("saved"); } catch (error) { setState("Studio belum bisa dibuka", error.message, true); }
  }
  initialize();
})();
