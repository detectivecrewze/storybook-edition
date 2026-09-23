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
  let musicPreviewTrackId = "";
  let giftUrl = "";
  let published = false;
  const mediaDeliveryErrors = new Set();
  const PREVIEW_TARGETS = Object.freeze({
    2: Object.freeze({ target: "gate", labelKey: "studio.opening" }),
    3: Object.freeze({ target: "room", roomType: "reasons", labelKey: "studio.reasons" }),
    4: Object.freeze({ target: "room", roomType: "gallery", labelKey: "studio.gallery" }),
    5: Object.freeze({ target: "room", roomType: "atlas", labelKey: "studio.atlas" }),
    6: Object.freeze({ target: "room", roomType: "music", labelKey: "studio.music" }),
    7: Object.freeze({ target: "room", roomType: "letter", labelKey: "studio.letter" }),
    8: Object.freeze({ target: "menu", labelKey: "studio.arrange", sceneSwitch: true }),
    9: Object.freeze({ target: "menu", labelKey: "studio.publish" })
  });
  let previewContext = null;
  let previewUpdateTimer = 0;
  let previewFrameLoaded = false;
  let previewRestoreFocus = null;
  const EXAMPLE_PROJECT_ID = "gift-2cf4f3ec9cf1eb9b";
  let fullPreviewLoaded = false;
  let pendingPreset = null;
  let presetRestoreFocus = null;
  let pendingDelete = null;
  let deleteRestoreFocus = null;
  let atlasHelpRestoreFocus = null;
  let studioGuideRestoreFocus = null;
  let qrRenderVersion = 0;
  let qrRenderPromise = Promise.resolve(null);
  const qrImageCache = new Map();
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
  function catalogQuote(track) { const value = Object.hasOwn(track || {}, "quote") ? track.quote : Object.hasOwn(track || {}, "quotes") ? track.quotes : track?.lyrics; return typeof value === "string" ? value.trim().slice(0, Project.MAX_MUSIC_QUOTE_LENGTH) : ""; }
  function saveIndicator(state) { const node = $("#save-state"); node.className = `save-state is-${state}`; node.textContent = state === "saving" ? I18n.t("studio.saving") : state === "dirty" ? I18n.t("studio.unsaved") : I18n.t("studio.autosaved"); }
  function draftSnapshot() {
    // API requests must receive an immutable copy. Passing the live object lets a
    // late response resurrect an older project and erase an upload or typed text.
    return typeof structuredClone === "function" ? structuredClone(draft) : JSON.parse(JSON.stringify(draft));
  }
  function queueSave({ immediatePreview = false } = {}) { draftRevision += 1; clearTimeout(saveTimer); saveIndicator("dirty"); saveTimer = setTimeout(saveDraft, 650); sendPreview({ immediate: immediatePreview }); }
  function saveDraft() {
    clearTimeout(saveTimer); syncAll(); const requestRevision = draftRevision; const snapshot = draftSnapshot(); saveIndicator("saving");
    saveQueue = saveQueue.catch(() => {}).then(() => api.saveStudio(snapshot, "draft")).then(result => {
      // A response may arrive after a newer keystroke or upload. Never replace the
      // current draft with that stale server copy; the newer snapshot is queued.
      if (requestRevision !== draftRevision) { console.info("[Storybook Studio] Ignored stale draft save", { projectId, requestRevision, draftRevision }); return; }
      const savedProject = Project.normalizeProject(result.project || snapshot, projectId, snapshot);
      if (savedProject.themeId !== snapshot.themeId && Themes.THEMES[snapshot.themeId]) {
        console.error("[Storybook Studio] Worker rejected the selected theme. Deploy the current Worker before publishing this theme.", { projectId, requestedThemeId: snapshot.themeId, returnedThemeId: savedProject.themeId });
        // Keep the live local draft intact. An older deployed Worker can return a
        // normalized Spider-Man copy, and accepting that response would also
        // roll back fields the customer just edited on another Studio step.
        draft = { ...draft, themeId: snapshot.themeId };
        renderThemes(); renderModules(); saveIndicator("dirty");
        sendPreview({ immediate: true });
        return;
      }
      draft = savedProject; saveIndicator("saved");
    }).catch(error => {
      if (requestRevision === draftRevision) saveIndicator("dirty");
      console.error("[Storybook Studio] Draft save failed", { projectId, status: error?.status, message: error?.message }, error);
    });
    return saveQueue;
  }
  function previewGiftSrc() {
    const isStaticLocal = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "3100";
    return isStaticLocal ? `/gift/index.html?project=${encodeURIComponent(projectId)}&preview=1` : `/gift/${encodeURIComponent(projectId)}?preview=1`;
  }
  function exampleGiftSrc(context) {
    const isStaticLocal = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "3100";
    const route = isStaticLocal ? `/gift/index.html?project=${encodeURIComponent(EXAMPLE_PROJECT_ID)}` : `/gift/${encodeURIComponent(EXAMPLE_PROJECT_ID)}`;
    const separator = route.includes("?") ? "&" : "?";
    const params = new URLSearchParams({ example: "1", target: context.target || "gate" });
    if (context.roomType) params.set("roomType", context.roomType);
    return `${route}${separator}${params}`;
  }
  function setPreviewStatus(key) { const status = $("#studio-preview-status"); if (status) status.textContent = I18n.t(key); }
  function activePreviewContext() { return previewContext ? { target: previewContext.target, roomType: previewContext.roomType || "" } : null; }
  function sendPreview({ immediate = false } = {}) {
    const dialog = $("#studio-preview-modal");
    const modalFrame = $("#studio-preview-device iframe");
    const fullFrame = $("#gift-preview");
    const targets = [];
    if (dialog?.open && modalFrame?.contentWindow && previewFrameLoaded && previewContext && !previewContext.isExample) targets.push({ frame: modalFrame, context: activePreviewContext() });
    if (fullFrame?.contentWindow && fullPreviewLoaded) targets.push({ frame: fullFrame, context: null });
    if (!draft || !targets.length) return;
    syncAll(); clearTimeout(previewUpdateTimer);
    if (dialog?.open) setPreviewStatus("studio.previewUpdating");
    const deliver = () => {
      previewUpdateTimer = 0;
      const snapshot = draftSnapshot();
      targets.forEach(({ frame, context }) => {
        if (!frame.isConnected || !frame.contentWindow) return;
        const message = { type: "storybook-preview", project: snapshot };
        if (context) message.context = context;
        frame.contentWindow.postMessage(message, location.origin);
      });
      if (dialog?.open) setPreviewStatus("studio.previewLive");
    };
    previewUpdateTimer = setTimeout(deliver, immediate ? 0 : 350);
  }
  function previewTitle(context) {
    const sectionTitle = context.target === "room" && context.roomType === "gallery" ? draft.modules.find(module => module.type === "gallery")?.title || I18n.t("studio.gallery") : I18n.t(context.labelKey || "studio.preview");
    return context.isExample ? `${I18n.t("studio.exampleTitle")} · ${sectionTitle}` : sectionTitle;
  }
  function updatePreviewControls() {
    const context = previewContext; if (!context) return;
    $("#studio-preview-title").textContent = previewTitle(context);
    $("#studio-preview-context").textContent = context.isExample ? I18n.t("studio.exampleInteractiveHelp") : context.target === "gate" ? I18n.t("studio.previewGateHelp") : I18n.t("studio.previewInteractiveHelp");
    const sceneSwitch = $("#preview-scene-switch"); sceneSwitch.hidden = !context.sceneSwitch;
    $$("[data-preview-scene]", sceneSwitch).forEach(button => button.setAttribute("aria-selected", String((context.target === "finale" ? "finale" : "menu") === button.dataset.previewScene)));
  }
  function detectedPreviewViewport() { return matchMedia("(min-width: 621px)").matches ? "desktop" : "mobile"; }
  function setPreviewViewport() {
    const stage = $("#studio-preview-stage"); if (!stage) return;
    stage.dataset.previewViewport = detectedPreviewViewport();
    const frameWindow = $("#studio-preview-device iframe")?.contentWindow;
    try { frameWindow?.dispatchEvent(new frameWindow.Event("resize")); } catch {}
  }
  function closePreview({ restoreFocus = true } = {}) {
    const dialog = $("#studio-preview-modal"); if (!dialog?.open) return;
    clearTimeout(previewUpdateTimer); previewUpdateTimer = 0; previewFrameLoaded = false;
    const frame = $("#studio-preview-device iframe");
    if (frame) { frame.src = "about:blank"; frame.remove(); }
    dialog.close(); document.documentElement.classList.remove("is-preview-open"); document.body.classList.remove("is-preview-open");
    const returnFocus = previewRestoreFocus; previewRestoreFocus = null; previewContext = null;
    if (restoreFocus) requestAnimationFrame(() => returnFocus?.focus?.({ preventScroll: true }));
  }
  function openPreview(context, trigger, { example = false } = {}) {
    const dialog = $("#studio-preview-modal"); const device = $("#studio-preview-device");
    if (!dialog || !device || !draft) return;
    if (dialog.open) closePreview({ restoreFocus: false });
    previewContext = { ...context, isExample: example }; previewRestoreFocus = trigger || document.activeElement; previewFrameLoaded = false;
    updatePreviewControls(); setPreviewViewport(); device.replaceChildren();
    const frame = document.createElement("iframe"); frame.title = I18n.t("studio.preview"); frame.loading = "eager"; frame.allow = "autoplay; fullscreen"; frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.addEventListener("load", () => {
      previewFrameLoaded = true;
      if (example) {
        setPreviewStatus("studio.exampleStatus");
        if (previewContext?.target && previewContext.target !== "menu") {
          frame.contentWindow?.postMessage({ type: "storybook-preview-target", context: activePreviewContext() }, location.origin);
        }
      } else {
        sendPreview({ immediate: true });
      }
    }, { once: true });
    frame.src = example ? exampleGiftSrc(context) : previewGiftSrc(); device.append(frame); document.documentElement.classList.add("is-preview-open"); document.body.classList.add("is-preview-open"); dialog.showModal();
    setPreviewStatus(example ? "studio.exampleStatus" : "studio.previewUpdating");
  }
  function ensurePreviewTriggers() {
    $$(".wizard-step[data-step]").forEach(section => {
      const step = Number(section.dataset.step); if (step < 2 || step > 8 || $("[data-preview-tools]", section)) return;
      const heading = $(".step-heading", section); if (!heading) return;
      const tools = document.createElement("div"); tools.className = "preview-tools"; tools.dataset.previewTools = "";
      tools.innerHTML = `<div class="preview-action-row"><button type="button" class="preview-trigger" data-preview-step="${step}" data-i18n="studio.previewSection"></button><button type="button" class="example-trigger" data-example-step="${step}" data-i18n="studio.exampleSection"></button></div><div class="preview-choice-hint"><div><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M5 24s7-11 19-11 19 11 19 11-7 11-19 11S5 24 5 24Z"/><circle cx="24" cy="24" r="5"/></svg><span><b data-i18n="studio.previewHintTitle"></b><small data-i18n="studio.previewHintHelp"></small></span></div><div><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M8 19h32v23H8zM5 12h38v9H5zM24 12v30M16 12c-5-4-2-9 2-7 4 2 6 7 6 7m8 0c5-4 2-9-2-7-4 2-6 7-6 7"/></svg><span><b data-i18n="studio.exampleHintTitle"></b><small data-i18n="studio.exampleHintHelp"></small></span></div></div>`;
      heading.append(tools); I18n.apply(tools);
    });
  }
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

  function applyStudioTheme() {
    const theme = Themes.applyTheme(draft.themeId);
    const palette = theme.palette;
    const root = document.documentElement;
    root.style.backgroundColor = "";
    root.style.backgroundImage = "";
    root.style.colorScheme = "light";
    if (document.body) {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
    }
    const aliases = { red: palette.primary, "red-dark": palette.primaryDark, blue: palette.secondary, yellow: palette.accent, paper: palette.paper, ink: palette.ink, muted: palette.muted, "studio-topbar": theme.studio?.topbar || palette.surface, "studio-sidebar": theme.studio?.sidebar || palette.surface };
    Object.entries(aliases).forEach(([name, value]) => root.style.setProperty(`--${name}`, value));
    root.style.setProperty("--line", `color-mix(in srgb, ${palette.muted} 28%, ${palette.paper})`);
    const atlasIcon = $("#atlas-theme-icon");
    if (atlasIcon) atlasIcon.src = theme.assets.atlas;
    return theme;
  }
  function renderThemes() {
    applyStudioTheme();
    const host = $("#theme-grid"); host.replaceChildren();
    Object.values(Themes.THEMES).forEach(theme => { const button = document.createElement("button"); button.type = "button"; button.className = `theme-card${draft.themeId === theme.id ? " is-selected" : ""}`; button.setAttribute("aria-pressed", draft.themeId === theme.id ? "true" : "false"); button.innerHTML = `<img alt=""><span><strong></strong><small></small></span>`; $("img", button).src = theme.thumbnail; $("strong", button).textContent = theme.label; $("small", button).textContent = typeof theme.description === "string" ? theme.description : theme.description[draft.settings.language] || theme.description.id; button.addEventListener("click", () => { if (draft.themeId === theme.id) return; draft.themeId = theme.id; renderThemes(); renderModules(); renderOpeningPanels(); updateGiftResult(); queueSave({ immediatePreview: true }); }); host.append(button); });
  }
  function renderOccasions() { const select = $("#occasion-preset"); select.replaceChildren(...Object.values(Project.OCCASION_PRESETS).map(preset => { const option = document.createElement("option"); option.value = preset.id; option.textContent = preset.label[draft.settings.language]; return option; })); select.value = draft.occasionPreset; }
  function renderReasons() {
    const host = $("#reasons-list"); host.replaceChildren(); draft.reasons.items.forEach((value, index) => { const fragment = $("#reason-template").content.cloneNode(true); const card = $("article", fragment); $(".reason-index", card).textContent = String(index + 1).padStart(2, "0"); $(".reason-card-identity small", card).textContent = I18n.t("studio.reasonCardKicker"); const input = $("textarea", card); input.value = value; input.addEventListener("input", () => { draft.reasons.items[index] = input.value; queueSave(); }); $("[data-remove]", card).addEventListener("click", event => {
      if (draft.reasons.items.length <= Project.MIN_REASONS) return;
      syncAll();
      requestDelete({
        trigger: event.currentTarget,
        titleKey: "studio.deleteReasonTitle",
        descriptionKey: "studio.deleteReasonDescription",
        action: () => {
          if (draft.reasons.items.length <= Project.MIN_REASONS || index >= draft.reasons.items.length) return;
          draft.reasons.items.splice(index, 1);
          renderReasons();
          queueSave();
        }
      });
    }); const moveButtons = $$("[data-move]", card); moveButtons.forEach(button => { button.disabled = button.dataset.move === "up" ? index === 0 : index === draft.reasons.items.length - 1; button.addEventListener("click", () => { syncAll(); swap(draft.reasons.items, index, button.dataset.move === "up" ? -1 : 1); renderReasons(); queueSave(); }); }); I18n.apply(card); host.append(fragment); }); dragSort(host, draft.reasons.items, () => { syncAll(); renderReasons(); });
  }
  function renderOpeningPanels() {
    const host = $("#opening-panel-grid"); host.replaceChildren();
    const currentTheme = Themes.getTheme(draft.themeId);
    const defaultPanels = currentTheme?.assets?.openingPanels || ["", "", "", ""];
    draft.opening.panelImages.forEach((source, index) => {
      const fragment = $("#opening-panel-template").content.cloneNode(true); const card = $("article", fragment); $("strong", card).textContent = `${I18n.t("studio.choosePhoto")} ${index + 1}`;
      const effectiveSource = source || defaultPanels[index] || "";
      const preview = $(".opening-panel-preview", card); if (effectiveSource) { const image = document.createElement("img"); image.src = effectiveSource; image.alt = `Opening panel ${index + 1}`; image.onerror = () => preview.replaceChildren(document.createTextNode("PHOTO")); preview.replaceChildren(image); }
      $(".opening-panel-file", card).addEventListener("change", event => { const file = event.target.files[0]; event.target.value = ""; uploadOpeningPanel(file, index); });
      $(".remove-opening-photo", card).hidden = !source; $(".remove-opening-photo", card).addEventListener("click", event => {
        requestDelete({
          trigger: event.currentTarget,
          titleKey: "studio.deleteOpeningPhotoTitle",
          descriptionKey: "studio.deleteOpeningPhotoDescription",
          action: () => {
            draft.opening.panelImages[index] = "";
            renderOpeningPanels();
            queueSave({ immediatePreview: true });
          }
        });
      });
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
      const cardIndex = $(".gallery-card-index", card);
      if (cardIndex) cardIndex.textContent = String(index + 1).padStart(2, "0");
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
      $("[data-remove]", card).addEventListener("click", event => {
        syncAll();
        const itemId = item.id;
        requestDelete({
          trigger: event.currentTarget,
          titleKey: "studio.deleteGalleryTitle",
          descriptionKey: "studio.deleteGalleryDescription",
          action: () => {
            const currentIndex = draft.gallery.items.findIndex(entry => entry.id === itemId);
            if (currentIndex < 0) return;
            draft.gallery.items.splice(currentIndex, 1);
            if (!draft.gallery.items.length) draft.gallery.items.push({ id: Project.makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" });
            renderGallery();
            queueSave({ immediatePreview: true });
          }
        });
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
    if (!location.label) return { kind: "idle", text: I18n.t("studio.locationHeadingEmpty") };
    return { kind: "valid", text: `${I18n.t("studio.locationReady")}: ${Maps.formatCoordinates(location.latitude, location.longitude)}` };
  }
  function openAtlasHelp(trigger) {
    const dialog = $("#atlas-help-dialog"); if (!dialog) return;
    atlasHelpRestoreFocus = trigger || document.activeElement;
    dialog.showModal();
    $("#close-atlas-help")?.focus({ preventScroll: true });
  }
  function closeAtlasHelp({ restoreFocus = true } = {}) {
    const dialog = $("#atlas-help-dialog"); if (!dialog?.open) return;
    dialog.close();
    const returnFocus = atlasHelpRestoreFocus; atlasHelpRestoreFocus = null;
    if (restoreFocus) requestAnimationFrame(() => returnFocus?.focus?.({ preventScroll: true }));
  }
  function openStudioGuide(trigger) {
    const dialog = $("#studio-guide-dialog"); if (!dialog) return;
    studioGuideRestoreFocus = trigger || document.activeElement;
    dialog.showModal();
    $("#start-studio-guide")?.focus({ preventScroll: true });
  }
  function closeStudioGuide({ restoreFocus = true, markSeen = true } = {}) {
    const dialog = $("#studio-guide-dialog"); if (!dialog?.open) return;
    if (markSeen) {
      try {
        localStorage.setItem(`storybook:guide:${projectId}`, "1");
        localStorage.setItem("storybook:guide:seen", "1");
      } catch {}
    }
    dialog.close();
    const returnFocus = studioGuideRestoreFocus; studioGuideRestoreFocus = null;
    if (restoreFocus) requestAnimationFrame(() => returnFocus?.focus?.({ preventScroll: true }));
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
    $(".atlas-studio-step")?.classList.toggle("is-atlas-enabled", Boolean(atlasModule?.enabled));
    const locationCount = $("#atlas-location-count");
    if (locationCount) locationCount.textContent = `${draft.atlas.locations.length} / ${Project.MAX_ATLAS_LOCATIONS}`;
    const host = $("#atlas-list"); host.replaceChildren();
    draft.atlas.locations.forEach((location, index) => {
      const fragment = $("#atlas-template").content.cloneNode(true); const card = $("article", fragment);
      card.dataset.id = location.id;
      const label = $(".atlas-label", card); const locationInput = $(".atlas-location-input", card); const note = $(".atlas-note", card); const status = $(".atlas-status", card); const preview = $(".atlas-photo-preview", card); const removePhotoBtn = $(".remove-atlas-photo", card);
      const numEl = $(".atlas-index-num", card); if (numEl) numEl.textContent = String(index + 1);
      $("[data-atlas-help]", card)?.addEventListener("click", event => openAtlasHelp(event.currentTarget));
      const moveUp = $('[data-move="up"]', card); if (moveUp) moveUp.disabled = index === 0;
      const moveDown = $('[data-move="down"]', card); if (moveDown) moveDown.disabled = index === draft.atlas.locations.length - 1;
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
        removePhotoBtn.addEventListener("click", event => {
          syncAll();
          const locationId = location.id;
          requestDelete({
            trigger: event.currentTarget,
            titleKey: "studio.deleteAtlasPhotoTitle",
            descriptionKey: "studio.deleteAtlasPhotoDescription",
            action: () => {
              const loc = draft.atlas.locations.find(entry => entry.id === locationId);
              if (!loc) return;
              loc.photoUrl = "";
              renderAtlas();
              queueSave({ immediatePreview: true });
            }
          });
        });
      }
      $("[data-remove]", card).addEventListener("click", event => {
        syncAll();
        const locationId = location.id;
        requestDelete({
          trigger: event.currentTarget,
          titleKey: "studio.deleteAtlasLocationTitle",
          descriptionKey: "studio.deleteAtlasLocationDescription",
          action: () => {
            const currentIndex = draft.atlas.locations.findIndex(entry => entry.id === locationId);
            if (currentIndex < 0) return;
            draft.atlas.locations.splice(currentIndex, 1);
            renderAtlas();
            queueSave({ immediatePreview: true });
          }
        });
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
  function trackCoverStatus(card, state, message = "") {
    const status = $(".track-cover-status", card);
    const input = $(".track-cover-file", card);
    if (status) { status.className = `track-cover-status${state ? ` is-${state}` : ""}`; status.textContent = message; }
    if (input) input.disabled = state === "uploading";
  }
  function setTrackCoverPreview(card, source) {
    const image = $(".track-cover img", card);
    const placeholder = $(".track-cover span", card);
    if (!image || !placeholder) return;
    if (!source) { image.removeAttribute("src"); image.hidden = true; placeholder.hidden = false; return; }
    image.hidden = false; placeholder.hidden = true;
    image.addEventListener("error", () => { image.hidden = true; placeholder.hidden = false; trackCoverStatus(card, "error", I18n.t("studio.uploadFailed")); }, { once: true });
    image.src = source;
  }
  async function uploadTrackCover(file, track, card) {
    if (!file || !track) return;
    if (mediaKind(file) !== "photo") { trackCoverStatus(card, "error", I18n.t("studio.imageOnly")); return; }
    if (file.size > 8 * 1024 * 1024) { trackCoverStatus(card, "error", I18n.t("studio.maxImage")); return; }
    const trackId = track.id;
    const cropped = await openCropperModal(file, {
      aspectRatio: 1,
      title: I18n.t("studio.cropTrackCover"),
      description: I18n.t("studio.cropTrackCoverDesc")
    });
    if (!cropped) return;
    trackCoverStatus(card, "uploading", I18n.t("studio.savingMedia"));
    try {
      console.info("[Storybook Studio] Preparing track artwork", { projectId, trackId, size: cropped.size, type: cropped.type });
      const result = await api.upload(cropped, "photo");
      if (!result?.url) throw new Error("Server tidak mengembalikan URL media.");
      const current = draft.music.tracks.find(entry => entry.id === trackId);
      if (!current) return;
      current.coverUrl = result.url;
      track.coverUrl = result.url;
      setTrackCoverPreview(card, result.url);
      const removeCover = $(".remove-track-cover", card);
      if (removeCover) removeCover.hidden = false;
      trackCoverStatus(card, "ready", I18n.t("studio.trackCoverUploaded"));
      queueSave({ immediatePreview: true });
    } catch (error) {
      trackCoverStatus(card, "error", error?.message || I18n.t("studio.uploadFailed"));
      reportUploadError("Cover lagu", error);
    }
  }
  function musicCatalogId(track) { return String(track?.id || track?.audioUrl || ""); }
  function currentMusicFilter() { return $("#music-search")?.value || ""; }
  function selectedCatalogAudioUrls() { return new Set(draft.music.tracks.map(track => track.audioUrl).filter(Boolean)); }
  function updateMusicSlotSummary() {
    const count = draft?.music?.tracks?.length || 0;
    const summary = $("#music-slot-summary");
    const playlistCount = $("#music-list-count");
    if (summary) summary.textContent = I18n.t("studio.musicSlots", { count, max: Project.MAX_MUSIC_TRACKS });
    if (playlistCount) playlistCount.textContent = `${count} / ${Project.MAX_MUSIC_TRACKS}`;
    const upload = $("#music-upload");
    const uploadLabel = upload?.closest("label");
    const isFull = count >= Project.MAX_MUSIC_TRACKS;
    if (upload) upload.disabled = isFull;
    if (uploadLabel) uploadLabel.classList.toggle("is-disabled", isFull);
  }
  function clearMusicCatalogPreviewState() {
    musicPreviewTrackId = "";
    const status = $("#music-preview-status");
    if (status) status.textContent = "";
  }
  function stopMusicCatalogPreview({ clearSource = true } = {}) {
    const audio = $("#music-catalog-preview");
    if (!audio) return;
    audio.pause();
    if (clearSource) { audio.removeAttribute("src"); audio.load(); clearMusicCatalogPreviewState(); }
  }
  function syncMusicPreviewButtons() { renderCatalog(currentMusicFilter()); }
  async function toggleMusicCatalogPreview(track) {
    const audio = $("#music-catalog-preview");
    const status = $("#music-preview-status");
    if (!audio || !track?.audioUrl) return;
    const id = musicCatalogId(track);
    if (musicPreviewTrackId === id && !audio.paused) { audio.pause(); clearMusicCatalogPreviewState(); syncMusicPreviewButtons(); return; }
    if (musicPreviewTrackId !== id) { audio.pause(); audio.src = track.audioUrl; audio.load(); musicPreviewTrackId = id; }
    if (status) status.textContent = I18n.t("studio.musicPreviewLoading", { title: track.title });
    try { await audio.play(); if (status) status.textContent = I18n.t("studio.musicPreviewNow", { title: track.title }); }
    catch { musicPreviewTrackId = ""; if (status) status.textContent = I18n.t("studio.musicPreviewError"); }
    syncMusicPreviewButtons();
  }
  function selectMusicSource(source) {
    const nextSource = source === "upload" ? "upload" : "catalog";
    $$('[data-music-source]').forEach(button => {
      const active = button.dataset.musicSource === nextSource;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $$('[data-source-panel]').forEach(panel => {
      const active = panel.dataset.sourcePanel === nextSource;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    if (nextSource !== "catalog") stopMusicCatalogPreview();
  }
  function addCatalogTrack(track) {
    if (!track?.audioUrl || draft.music.tracks.some(item => item.audioUrl === track.audioUrl)) return;
    if (draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS) return;
    draft.music.tracks.push({ id: track.id || Project.makeId("track"), sourceType: "catalog", catalogId: track.id || "", audioUrl: track.audioUrl, coverUrl: track.coverUrl || "", title: track.title, artist: track.artist || "", quote: catalogQuote(track) });
    renderMusic();
    queueSave({ immediatePreview: true });
  }
  function renderMusic() {
    const host = $("#music-list"); host.replaceChildren(); draft.music.tracks.forEach((track, index) => {
      const fragment = $("#track-template").content.cloneNode(true); const card = $("article", fragment);
      card.dataset.id = track.id;
      const titleInput = $(".track-title", card); const artistInput = $(".track-artist", card); const quoteInput = $(".track-quote", card); const quoteCount = $(".track-quote-count", card);
      const coverInput = $(".track-cover-file", card); const removeCover = $(".remove-track-cover", card);
      const summary = $(".track-card-summary", card);
      $(".track-card-index", card).textContent = String(index + 1).padStart(2, "0");
      titleInput.value = track.title; artistInput.value = track.artist; quoteInput.value = track.quote || ""; quoteCount.textContent = String(quoteInput.value.length);
      const syncSummary = () => { summary.textContent = [titleInput.value.trim(), artistInput.value.trim()].filter(Boolean).join(" · ") || ("Track " + (index + 1)); };
      syncSummary(); setTrackCoverPreview(card, track.coverUrl); removeCover.hidden = !track.coverUrl;
      const getActiveTrack = () => draft.music.tracks.find(entry => entry.id === track.id) || null;
      titleInput.addEventListener("input", event => { const current = getActiveTrack(); track.title = event.target.value; if (current) current.title = event.target.value; syncSummary(); queueSave(); });
      artistInput.addEventListener("input", event => { const current = getActiveTrack(); track.artist = event.target.value; if (current) current.artist = event.target.value; syncSummary(); queueSave(); });
      quoteInput.addEventListener("input", event => { const current = getActiveTrack(); track.quote = event.target.value; if (current) current.quote = event.target.value; quoteCount.textContent = String(event.target.value.length); queueSave(); });
      coverInput.addEventListener("change", event => { const file = event.target.files[0]; event.target.value = ""; const current = getActiveTrack(); if (current) uploadTrackCover(file, current, card); });
      removeCover.addEventListener("click", event => {
        syncAll(); const trackId = track.id;
        requestDelete({ trigger: event.currentTarget, titleKey: "studio.deleteTrackCoverTitle", descriptionKey: "studio.deleteTrackCoverDescription", action: () => { const current = draft.music.tracks.find(entry => entry.id === trackId); if (!current) return; current.coverUrl = ""; renderMusic(); queueSave({ immediatePreview: true }); } });
      });
      const moveButtons = $$('[data-track-move]', card);
      moveButtons.forEach(button => {
        button.disabled = button.dataset.trackMove === "up" ? index === 0 : index === draft.music.tracks.length - 1;
        button.addEventListener("click", () => {
          syncAll(); const currentIndex = draft.music.tracks.findIndex(entry => entry.id === track.id); if (currentIndex < 0) return;
          swap(draft.music.tracks, currentIndex, button.dataset.trackMove === "up" ? -1 : 1);
          renderMusic(); queueSave({ immediatePreview: true });
        });
      });
      $("[data-remove]", card).addEventListener("click", event => {
        syncAll(); const trackId = track.id;
        requestDelete({ trigger: event.currentTarget, titleKey: "studio.deleteTrackTitle", descriptionKey: "studio.deleteTrackDescription", action: () => { const currentIndex = draft.music.tracks.findIndex(entry => entry.id === trackId); if (currentIndex < 0) return; draft.music.tracks.splice(currentIndex, 1); renderMusic(); queueSave({ immediatePreview: true }); } });
      });
      I18n.apply(card); host.append(fragment);
    });
    updateMusicSlotSummary();
    renderCatalog(currentMusicFilter());
  }
  function renderCatalog(filter = "") {
    const host = $("#music-catalog"); if (!host) return;
    host.replaceChildren();
    const query = filter.trim().toLowerCase();
    const existingAudio = selectedCatalogAudioUrls();
    const isFull = draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS;
    const matches = catalog.filter(track => !query || (String(track.title || "") + " " + String(track.artist || "")).toLowerCase().includes(query)).slice(0, 60);
    matches.forEach(track => {
      const id = musicCatalogId(track); const alreadyAdded = existingAudio.has(track.audioUrl);
      const row = document.createElement("article"); row.className = "catalog-track" + (alreadyAdded ? " is-added" : ""); row.setAttribute("role", "option"); row.setAttribute("aria-selected", String(alreadyAdded));
      const cover = document.createElement("img"); cover.alt = ""; cover.src = track.coverUrl || ""; cover.loading = "lazy";
      const copy = document.createElement("span"); const title = document.createElement("strong"); const artist = document.createElement("small"); title.textContent = track.title; artist.textContent = track.artist || ""; copy.append(title, artist);
      const preview = document.createElement("button"); preview.type = "button"; preview.className = "catalog-preview-button"; const isPlaying = musicPreviewTrackId === id && !$("#music-catalog-preview")?.paused; preview.classList.toggle("is-playing", isPlaying); preview.setAttribute("aria-label", I18n.t(isPlaying ? "studio.musicPauseTrack" : "studio.musicPreviewTrack", { title: track.title })); preview.innerHTML = '<span class="catalog-audio-icon" aria-hidden="true"><i></i></span><b></b>'; $("b", preview).textContent = I18n.t(isPlaying ? "studio.musicPause" : "studio.musicPreview"); preview.addEventListener("click", () => toggleMusicCatalogPreview(track));
      const select = document.createElement("button"); select.type = "button"; select.className = "catalog-select-button"; select.disabled = alreadyAdded || isFull; select.textContent = I18n.t(alreadyAdded ? "studio.musicAlreadyAdded" : "studio.musicSelect"); select.addEventListener("click", () => addCatalogTrack(track));
      row.append(cover, copy, preview, select); host.append(row);
    });
    if (!matches.length) { const empty = document.createElement("p"); empty.className = "music-catalog-empty"; empty.textContent = I18n.t("studio.musicNoResults"); host.append(empty); }
    updateMusicSlotSummary();
  }
  function updateChapterCount() {
    const count = $("#chapter-count");
    if (!count || !draft) return;
    const visible = draft.modules.filter(module => module.enabled).length;
    count.textContent = `${visible}/${draft.modules.length} ${I18n.t("studio.chapterActive")}`;
  }
  function renderModules() {
    const host = $("#module-editor");
    const theme = Themes.getTheme(draft.themeId);
    host.replaceChildren();
    draft.modules.sort((a, b) => a.order - b.order).forEach((module, index) => {
      const fragment = $("#module-template").content.cloneNode(true);
      const row = $("article", fragment);
      row.dataset.type = module.type;
      row.classList.toggle("is-disabled", !module.enabled);
      $(".module-order", row).textContent = String(index + 1).padStart(2, "0");
      const icon = $(".module-icon img", row);
      const previewImage = $(".module-preview-paper img", row);
      const themeAsset = theme.assets[module.type] || "";
      icon.src = themeAsset; icon.alt = "";
      previewImage.src = themeAsset; previewImage.alt = "";
      const toggle = $(".module-enabled", row);
      const status = $(".module-status", row);
      const titleInput = $(".module-title", row);
      const subtitleInput = $(".module-subtitle", row);
      const previewTitle = $(".module-preview-title", row);
      const previewSubtitle = $(".module-preview-subtitle", row);
      const getActiveModule = () => draft.modules.find(entry => entry.type === module.type) || null;
      const syncModulePreview = () => {
        previewTitle.textContent = titleInput.value.trim() || module.title || I18n.t("studio.titleField");
        previewSubtitle.textContent = subtitleInput.value.trim() || module.subtitle || " ";
      };
      const syncToggleState = () => {
        row.classList.toggle("is-disabled", !module.enabled);
        status.textContent = I18n.t(module.enabled ? "studio.chapterActive" : "studio.chapterHidden");
        toggle.setAttribute("aria-label", status.textContent);
        updateChapterCount();
      };
      toggle.checked = module.enabled;
      titleInput.value = module.title;
      subtitleInput.value = module.subtitle;
      syncModulePreview();
      const moveButtons = $$('[data-move]', row);
      moveButtons.forEach(button => { button.disabled = button.dataset.move === "up" ? index === 0 : index === draft.modules.length - 1; });
      toggle.addEventListener("change", () => {
        const current = getActiveModule();
        module.enabled = toggle.checked;
        if (current) current.enabled = toggle.checked;
        if (module.type === "atlas") {
          const atlasToggle = $("#atlas-enabled");
          if (atlasToggle) atlasToggle.checked = module.enabled;
        }
        syncToggleState();
        console.info("[Storybook Studio] Module changed", { projectId, module: module.type, enabled: module.enabled });
        queueSave({ immediatePreview: true });
      });
      titleInput.addEventListener("input", event => {
        const current = getActiveModule();
        module.title = event.target.value;
        if (current) current.title = event.target.value;
        syncModulePreview();
        if (module.type === "gallery") {
          const stepTitle = $("#gallery-module-title");
          if (stepTitle && stepTitle.value !== event.target.value) stepTitle.value = event.target.value;
          updateGalleryTitleUI(event.target.value);
        }
        queueSave();
      });
      subtitleInput.addEventListener("input", event => {
        const current = getActiveModule();
        module.subtitle = event.target.value;
        if (current) current.subtitle = event.target.value;
        syncModulePreview();
        if (module.type === "gallery") {
          const stepSubtitle = $("#gallery-module-subtitle");
          if (stepSubtitle && stepSubtitle.value !== event.target.value) stepSubtitle.value = event.target.value;
        }
        queueSave();
      });
      moveButtons.forEach(button => button.addEventListener("click", () => {
        swap(draft.modules, index, button.dataset.move === "up" ? -1 : 1);
        draft.modules.forEach((item, order) => item.order = order);
        renderModules();
        queueSave({ immediatePreview: true });
      }));
      syncToggleState();
      I18n.apply(row);
      host.append(fragment);
    });
    updateChapterCount();
    dragSort(host, draft.modules, () => {
      draft.modules.forEach((item, order) => item.order = order);
      renderModules();
    });
  }  function renderFields() {
    I18n.setLocale(draft.settings.language);
    const decorativeLabels = [[".opening-photo-board>header p", "studio.openingPanelsKicker"], [".reasons-list-heading p", "studio.comicNotesKicker"], [".letter-paper-heading span", "studio.letterMailKicker"]];
    decorativeLabels.forEach(([selector, key]) => { const node = $(selector); if (node) node.textContent = I18n.t(key); });
    I18n.apply(); $("#studio-language").value = draft.settings.language; renderThemes(); renderOccasions();
    $("#recipient").value = draft.identity.recipient; $("#sender").value = draft.identity.sender; const eventDateEl = $("#event-date"); if (eventDateEl) eventDateEl.value = draft.identity.eventDate;
    $("#opening-eyebrow").value = draft.opening.eyebrow; $("#opening-title").value = draft.opening.title; $("#opening-message").value = draft.opening.message; renderOpeningPanels();
    renderReasons(); renderGallery(); renderAtlas(); renderMusic(); $("#letter-greeting").value = draft.letter.greeting; $("#letter-body").value = draft.letter.paragraphs.join("\n\n"); $("#letter-signoff").value = draft.letter.signoff;
    renderModules(); $("#finale-title").value = draft.finale.title; $("#finale-message").value = draft.finale.message; $("#finale-signoff").value = draft.finale.signoff; updateGiftResult(); goToStep(currentStep, false); sendPreview();
  }
  function syncAll() {
    if (!draft) return; draft.identity.recipient = $("#recipient").value; draft.identity.sender = $("#sender").value; const eventDateEl = $("#event-date"); if (eventDateEl) draft.identity.eventDate = eventDateEl.value;
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
      const track = draft.music.tracks.find(entry => entry.id === card.dataset.id) || draft.music.tracks[index];
      if (!track) return;
      const title = $(".track-title", card);
      if (title) track.title = title.value.trim();
      const artist = $(".track-artist", card);
      if (artist) track.artist = artist.value.trim();
      const quote = $(".track-quote", card);
      if (quote) track.quote = quote.value;
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
  function applyOccasionPreset(key) {
    draft = Project.applyOccasionPreset(draft, key);
    renderFields();
    queueSave({ immediatePreview: true });
  }
  function applyReasonsPreset(key) {
    const source = CONTENT_PRESETS[draft.settings.language]?.reasons?.[key];
    if (!source) return;
    draft.reasons.items = source.map(presetText);
    renderReasons();
    queueSave({ immediatePreview: true });
  }
  function applyLetterPreset(key) {
    const source = CONTENT_PRESETS[draft.settings.language]?.letter?.[key];
    if (!source) return;
    draft.letter = { greeting: presetText(source.greeting), paragraphs: source.paragraphs.map(presetText), signoff: presetText(source.signoff) };
    $("#letter-greeting").value = draft.letter.greeting;
    $("#letter-body").value = draft.letter.paragraphs.join("\n\n");
    $("#letter-signoff").value = draft.letter.signoff;
    queueSave({ immediatePreview: true });
  }
  function closePresetConfirmation({ restoreFocus = true } = {}) {
    const dialog = $("#preset-confirm-dialog");
    if (!dialog?.open) return;
    dialog.close();
    if (pendingPreset?.kind === "occasion") $("#occasion-preset").value = draft.occasionPreset;
    pendingPreset = null;
    const returnFocus = presetRestoreFocus;
    presetRestoreFocus = null;
    if (restoreFocus) requestAnimationFrame(() => returnFocus?.focus?.({ preventScroll: true }));
  }
  function requestPreset(kind, key, trigger) {
    syncAll();
    const dialog = $("#preset-confirm-dialog");
    if (!dialog || !key || (kind === "occasion" && key === draft.occasionPreset)) return;
    pendingPreset = { kind, key };
    presetRestoreFocus = trigger || document.activeElement;
    const descriptionKey = kind === "reasons" ? "studio.presetConfirmReasons" : kind === "letter" ? "studio.presetConfirmLetter" : "studio.presetConfirmOccasion";
    $("#preset-confirm-description").textContent = I18n.t(descriptionKey);
    dialog.showModal();
    $("#cancel-preset-confirm")?.focus({ preventScroll: true });
  }
  function confirmPreset() {
    const preset = pendingPreset;
    if (!preset) return closePresetConfirmation();
    if (preset.kind === "reasons") applyReasonsPreset(preset.key);
    else if (preset.kind === "letter") applyLetterPreset(preset.key);
    else applyOccasionPreset(preset.key);
    closePresetConfirmation();
  }
  function closeDeleteConfirmation({ restoreFocus = true } = {}) {
    const dialog = $("#delete-confirm-dialog");
    if (dialog?.open) dialog.close();
    const returnFocus = deleteRestoreFocus;
    pendingDelete = null;
    deleteRestoreFocus = null;
    if (restoreFocus) requestAnimationFrame(() => returnFocus?.focus?.({ preventScroll: true }));
  }
  function requestDelete({ titleKey, descriptionKey, trigger, action }) {
    const dialog = $("#delete-confirm-dialog");
    if (!dialog || typeof action !== "function") return;
    pendingDelete = { action };
    deleteRestoreFocus = trigger || document.activeElement;
    $("#delete-confirm-title").textContent = I18n.t(titleKey);
    $("#delete-confirm-description").textContent = I18n.t(descriptionKey);
    dialog.showModal();
    $("#cancel-delete-confirm")?.focus({ preventScroll: true });
  }
  function confirmDelete() {
    const action = pendingDelete?.action;
    closeDeleteConfirmation({ restoreFocus: false });
    action?.();
  }
  function reportUploadError(label, error) {
    console.error("[Storybook Studio] Upload flow failed", { projectId, label, status: error?.status, message: error?.message }, error);
    const message = error?.message || "Terjadi kesalahan yang tidak diketahui.";
    alert(`${label} gagal diupload. ${message}\n\nBuka Console browser untuk detail error.`);
  }
  function goToStep(step, scroll = true) { const previousStep = currentStep; currentStep = Math.max(1, Math.min(9, step)); if (previousStep === 6 && currentStep !== 6) stopMusicCatalogPreview(); $$(".wizard-step").forEach(node => node.classList.toggle("is-active", Number(node.dataset.step) === currentStep)); $$("#step-list li").forEach(node => node.classList.toggle("is-active", Number($("button", node).dataset.stepTarget) === currentStep)); $("#previous-step").disabled = currentStep === 1; $("#next-step").hidden = currentStep === 9; $("#step-progress").textContent = `${currentStep} / 9`; $("#progress-fill").style.width = `${currentStep / 9 * 100}%`; if (scroll) scrollTo({ top: 0, behavior: "smooth" }); }
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
      renderOpeningPanels(); queueSave({ immediatePreview: true });
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
      queueSave({ immediatePreview: true });
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
      queueSave({ immediatePreview: true });
    } catch (error) {
      atlasUploadStatus(card, "error", error?.message || I18n.t("studio.uploadFailed"));
      reportUploadError("Foto lokasi", error);
    }
  }
  function musicUploadStatus(state, message = "") {
    const status = $("#music-upload-status");
    const input = $("#music-upload");
    const label = input?.closest("label");
    if (status) { status.className = state ? "is-" + state : ""; status.textContent = message; }
    const usedSlots = draft?.music?.tracks?.length || 0;
    const disabled = state === "uploading" || usedSlots >= Project.MAX_MUSIC_TRACKS;
    if (input) input.disabled = disabled;
    if (label) { label.classList.toggle("is-uploading", state === "uploading"); label.classList.toggle("is-disabled", disabled); }
  }
  async function uploadAudio(file) {
    if (!file) return;
    const usedSlots = draft.music.tracks.length;
    if (usedSlots >= Project.MAX_MUSIC_TRACKS) { musicUploadStatus("error", I18n.t("studio.maxTracks")); return; }
    if (file.size > 20 * 1024 * 1024) { musicUploadStatus("error", I18n.t("studio.maxAudio")); return; }
    musicUploadStatus("uploading", I18n.t("studio.musicUploading"));
    try {
      console.info("[Storybook Studio] Preparing audio", { projectId, size: file.size, type: file.type });
      const result = await api.upload(file, "audio");
      if (!result?.url) throw new Error(I18n.t("studio.uploadFailed"));
      draft.music.tracks.push({ id: Project.makeId("track"), sourceType: "upload", catalogId: "", audioUrl: result.url, coverUrl: "", title: file.name.replace(/\.[^.]+$/, ""), artist: "", quote: "" });
      musicUploadStatus("ready", I18n.t("studio.musicUploaded"));
      renderMusic(); queueSave({ immediatePreview: true });
    } catch (error) {
      musicUploadStatus("error", error?.message || I18n.t("studio.uploadFailed"));
      reportUploadError("Audio", error);
    }
  }
  function roundedCanvasRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }
  function drawStorybookQr(model, ink) {
    const modules = model.getModuleCount();
    const quiet = 4;
    const unit = Math.max(7, Math.floor(520 / (modules + quiet * 2)));
    const size = (modules + quiet * 2) * unit;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#fffdf5"; context.fillRect(0, 0, size, size);
    context.fillStyle = ink;
    for (let row = 0; row < modules; row += 1) for (let column = 0; column < modules; column += 1) if (model.isDark(row, column)) context.fillRect((column + quiet) * unit, (row + quiet) * unit, unit, unit);
    return canvas;
  }
  function loadQrImage(source) {
    if (!source) return Promise.resolve(null);
    if (qrImageCache.has(source)) return qrImageCache.get(source);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = "async";
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
    qrImageCache.set(source, promise);
    return promise;
  }
  function fitQrText(context, value, maxWidth) {
    let result = String(value || "").trim();
    while (result.length > 1 && context.measureText(result + "…").width > maxWidth) result = result.slice(0, -1);
    return result === String(value || "").trim() ? result : result.trim() + "…";
  }
  function drawQrIllustration(context, image, x, y, width, height) {
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const ratio = Math.min(width / imageWidth, height / imageHeight);
    const drawWidth = imageWidth * ratio;
    const drawHeight = imageHeight * ratio;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }
  function drawQrSticker(context, image, x, y, size, rotation = 0) {
    if (!image) return;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.shadowColor = "rgba(23, 25, 31, .24)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 7;
    drawQrIllustration(context, image, -size / 2, -size / 2, size, size);
    context.restore();
  }
  async function loadQrArtwork(theme) {
    const sources = theme.assets?.qr || {};
    const heroSource = sources.hero || theme.assets?.greeting;
    let hero = await loadQrImage(heroSource);
    if (!hero && heroSource !== (sources.heroFallback || theme.assets?.greeting)) hero = await loadQrImage(sources.heroFallback || theme.assets?.greeting);
    const stickers = await Promise.all((Array.isArray(sources.stickers) ? sources.stickers : []).slice(0, 2).map(loadQrImage));
    return { hero, stickers: stickers.filter(Boolean) };
  }
  function drawQrHeartSeal(context, x, y, size, fill, stroke) {
    const half = size / 2;
    context.save(); context.translate(x, y); context.beginPath();
    context.moveTo(0, half * .82);
    context.bezierCurveTo(-half * 1.15, half * .14, -half * .94, -half * .72, 0, -half * .16);
    context.bezierCurveTo(half * .94, -half * .72, half * 1.15, half * .14, 0, half * .82);
    context.closePath(); context.fillStyle = fill; context.fill(); context.strokeStyle = stroke; context.lineWidth = 7; context.stroke(); context.restore();
  }
  function drawStorybookQrCard(qrCanvas, artwork) {
    const canvas = document.createElement("canvas");
    canvas.className = "qr-gift-card-canvas";
    canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext("2d");
    const theme = Themes.getTheme(draft.themeId);
    const palette = theme.palette;
    const recipient = draft.identity.recipient.trim() || (draft.settings.language === "en" ? "someone special" : "seseorang spesial");
    const sender = draft.identity.sender.trim() || (draft.settings.language === "en" ? "someone who cares" : "seseorang yang menyayangimu");
    const scanText = draft.settings.language === "en" ? "SCAN TO OPEN THE STORY" : "SCAN UNTUK MEMBUKA CERITA";
    const fromText = draft.settings.language === "en" ? "A story from " : "Sebuah cerita dari ";

    const outer = context.createLinearGradient(0, 0, 1080, 1350);
    outer.addColorStop(0, palette.primary); outer.addColorStop(1, palette.primaryDark);
    context.fillStyle = outer; context.fillRect(0, 0, 1080, 1350);
    context.globalAlpha = .22; context.strokeStyle = palette.ink; context.lineWidth = 3;
    for (let x = -80; x < 1160; x += 100) {
      context.beginPath(); context.arc(x, 80, 290, .1, Math.PI * .9); context.stroke();
      context.beginPath(); context.arc(x, 80, 190, .1, Math.PI * .9); context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = palette.paper; roundedCanvasRect(context, 56, 54, 968, 1242, 42); context.fill();
    context.strokeStyle = palette.ink; context.lineWidth = 8; context.stroke();
    context.fillStyle = palette.ink; context.font = '900 28px "DM Sans", sans-serif'; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(draft.settings.language === "en" ? "A LITTLE STORY FOR" : "CERITA KECIL UNTUK", 540, 142);
    context.font = '400 72px Bangers, Impact, sans-serif'; context.fillStyle = palette.primary; context.fillText(fitQrText(context, recipient, 760), 540, 218);
    drawQrSticker(context, artwork?.hero, 860, 190, 204, .08);

    context.fillStyle = "#fffdf5"; roundedCanvasRect(context, 230, 330, 620, 620, 34); context.fill(); context.strokeStyle = palette.ink; context.lineWidth = 7; context.stroke();
    context.imageSmoothingEnabled = false; context.drawImage(qrCanvas, 270, 370, 540, 540); context.imageSmoothingEnabled = true;
    drawQrHeartSeal(context, 540, 640, 54, palette.primary, "#fffdf5");
    drawQrSticker(context, artwork?.stickers?.[0], 146, 442, 138, -.12);
    drawQrSticker(context, artwork?.stickers?.[1], 928, 882, 136, .11);
    context.fillStyle = palette.ink; context.font = '900 25px "DM Sans", sans-serif'; context.letterSpacing = "2px"; context.fillText(scanText, 540, 1022); context.letterSpacing = "0px";
    context.fillStyle = palette.muted; context.font = '600 33px Caveat, cursive'; context.fillText(fitQrText(context, fromText + sender, 780), 540, 1087);
    context.fillStyle = palette.accent; context.fillRect(232, 1142, 616, 6);
    context.fillStyle = palette.ink; context.font = '800 19px "DM Sans", sans-serif'; context.fillText(draft.settings.language === "en" ? "KEEP THIS LITTLE CHAPTER CLOSE" : "SIMPAN BAB KECIL INI DEKATMU", 540, 1190);
    return canvas;
  }
  async function buildQrCard(url, version) {
    if (!window.QRCode) throw new Error(I18n.t("studio.qrUnavailable"));
    const probe = document.createElement("div");
    const instance = new window.QRCode(probe, { text: url, width: 360, height: 360, colorDark: "#17191f", colorLight: "#fffdf5", correctLevel: window.QRCode.CorrectLevel.H });
    const model = instance._oQRCode;
    if (!model?.getModuleCount || !model?.isDark) throw new Error(I18n.t("studio.qrUnavailable"));
    if (document.fonts?.ready) await document.fonts.ready;
    const theme = Themes.getTheme(draft.themeId);
    const artwork = await loadQrArtwork(theme);
    const canvas = drawStorybookQrCard(drawStorybookQr(model, theme.palette.ink), artwork);
    if (version === qrRenderVersion) $("#qr-code")?.replaceChildren(canvas);
    return canvas;
  }
  function renderQrCard(url) {
    const target = $("#qr-code"); const button = $("#download-qr");
    const version = ++qrRenderVersion;
    if (!target || !url) { if (target) target.replaceChildren(); if (button) button.disabled = true; return Promise.resolve(null); }
    const message = document.createElement("p"); message.className = "qr-render-message"; message.textContent = I18n.t("studio.qrPreparing"); target.replaceChildren(message);
    if (button) button.disabled = true;
    qrRenderPromise = buildQrCard(url, version).catch(error => { if (version === qrRenderVersion) { message.textContent = error?.message || I18n.t("studio.qrUnavailable"); target.replaceChildren(message); } return null; }).then(canvas => { if (version === qrRenderVersion && button) button.disabled = !canvas; return canvas; });
    return qrRenderPromise;
  }
  async function downloadQrCard() {
    const canvas = await qrRenderPromise;
    if (!canvas) return;
    const recipient = (draft.identity.recipient || "storybook").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "storybook";
    const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "storybook-" + recipient + "-qr.png"; link.click();
  }
  function updateGiftResult() {
    $("#gift-url").value = giftUrl;
    $("#open-public-gift").href = giftUrl || "#";
    $("#publish-note").textContent = published ? I18n.t("studio.published") : I18n.t("studio.publishHint");
    const sharePanel = $("#gift-share-panel");
    if (sharePanel) sharePanel.hidden = !published;
    const button = $("#publish-button");
    if (button) {
      button.classList.toggle("is-live", published);
      button.textContent = I18n.t(published ? "studio.updateGift" : "studio.publishButton");
    }
    renderQrCard(giftUrl && published ? giftUrl : "");
  }
  async function publish() { syncAll(); const validation = Project.validateProject(draft, { forPublish: true }); if (!validation.valid) return showErrors(validation.errors); clearErrors(); const button = $("#publish-button"); button.disabled = true; button.textContent = I18n.t("studio.publishing"); try { clearTimeout(saveTimer); await saveQueue.catch(() => {}); const result = await api.saveStudio(validation.project, "published"); draft = Project.normalizeProject(result.project || validation.project, projectId, draft); giftUrl = result.giftUrl || giftUrl; published = true; saveIndicator("saved"); updateGiftResult(); sendPreview(); } catch (error) { alert(error.message); } finally { button.disabled = false; button.textContent = I18n.t(published ? "studio.updateGift" : "studio.publishButton"); } }

  function bind() {
    $("#studio-retry").addEventListener("click", () => location.reload());
    $("#studio-form").addEventListener("input", event => { if (event.target.closest("#opening-panel-grid,#reasons-list,#gallery-list,#atlas-list,#music-list,#module-editor")) return; syncAll(); queueSave(); });
    $("#studio-language").addEventListener("change", event => { syncAll(); Project.changeLanguage(draft, event.target.value); renderFields(); queueSave(); });
    $("#occasion-preset").addEventListener("change", event => requestPreset("occasion", event.target.value, event.currentTarget));
    $$('[data-reasons-preset]').forEach(button => button.addEventListener("click", event => requestPreset("reasons", button.dataset.reasonsPreset, event.currentTarget)));
    $$('[data-letter-preset]').forEach(button => button.addEventListener("click", event => requestPreset("letter", button.dataset.letterPreset, event.currentTarget)));
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
    $("#atlas-enabled").addEventListener("change", event => { const module = draft.modules.find(item => item.type === "atlas"); if (!module) return; module.enabled = event.target.checked; $(".atlas-studio-step")?.classList.toggle("is-atlas-enabled", module.enabled); console.info("[Storybook Studio] Module changed", { projectId, module: "atlas", enabled: module.enabled }); renderModules(); queueSave(); });
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
    $$('[data-music-source]').forEach(button => button.addEventListener("click", () => selectMusicSource(button.dataset.musicSource)));
    $("#music-search")?.addEventListener("input", event => renderCatalog(event.target.value));
    $("#music-upload")?.addEventListener("change", event => { const file = event.target.files[0]; event.target.value = ""; uploadAudio(file); });
    const musicPreview = $("#music-catalog-preview");
    if (musicPreview) { musicPreview.addEventListener("play", syncMusicPreviewButtons); musicPreview.addEventListener("pause", syncMusicPreviewButtons); musicPreview.addEventListener("ended", () => { clearMusicCatalogPreviewState(); syncMusicPreviewButtons(); }); musicPreview.addEventListener("error", () => { musicPreviewTrackId = ""; const status = $("#music-preview-status"); if (status) status.textContent = I18n.t("studio.musicPreviewError"); syncMusicPreviewButtons(); }); }
    $("#previous-step").addEventListener("click", () => goToStep(currentStep - 1)); $("#next-step").addEventListener("click", () => { syncAll(); goToStep(currentStep + 1); }); $$("[data-step-target]").forEach(button => button.addEventListener("click", () => { syncAll(); goToStep(Number(button.dataset.stepTarget)); }));
    $$("[data-preview-step]").forEach(button => button.addEventListener("click", () => openPreview(PREVIEW_TARGETS[Number(button.dataset.previewStep)], button)));
    $$("[data-example-step]").forEach(button => button.addEventListener("click", () => openPreview(PREVIEW_TARGETS[Number(button.dataset.exampleStep)], button, { example: true })));
    $("#close-studio-preview")?.addEventListener("click", () => closePreview());
    $$("[data-preview-scene]").forEach(button => button.addEventListener("click", () => {
      if (!previewContext) return;
      previewContext.target = button.dataset.previewScene;
      previewContext.roomType = "";
      updatePreviewControls();
      if (previewContext.isExample) {
        const modalFrame = $("#studio-preview-device iframe");
        if (modalFrame?.contentWindow && previewFrameLoaded) {
          modalFrame.contentWindow.postMessage({ type: "storybook-preview-target", context: activePreviewContext() }, location.origin);
        }
      } else {
        sendPreview({ immediate: true });
      }
      button.focus({ preventScroll: true });
    }));
    const previewDialog = $("#studio-preview-modal");
    if (previewDialog) { previewDialog.addEventListener("cancel", event => { event.preventDefault(); closePreview(); }); previewDialog.addEventListener("click", event => { if (event.target === previewDialog) closePreview(); }); $("#preview-scene-switch")?.addEventListener("keydown", event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; const tabs = $$("[data-preview-scene]"); const index = tabs.indexOf(document.activeElement); if (index < 0) return; event.preventDefault(); tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length].click(); }); }
    window.addEventListener("resize", () => { if ($("#studio-preview-modal")?.open) setPreviewViewport(); });
    $("#publish-button").addEventListener("click", publish);
    $("#copy-gift-url").addEventListener("click", () => giftUrl && navigator.clipboard.writeText(giftUrl));
    $("#download-qr")?.addEventListener("click", downloadQrCard);
    $("#cancel-preset-confirm")?.addEventListener("click", () => closePresetConfirmation());
    $("#confirm-preset")?.addEventListener("click", confirmPreset);
    const presetDialog = $("#preset-confirm-dialog");
    if (presetDialog) {
      presetDialog.addEventListener("cancel", event => { event.preventDefault(); closePresetConfirmation(); });
      presetDialog.addEventListener("click", event => { if (event.target === presetDialog) closePresetConfirmation(); });
    }
    $("#cancel-delete-confirm")?.addEventListener("click", () => closeDeleteConfirmation());
    $("#confirm-delete")?.addEventListener("click", confirmDelete);
    const deleteDialog = $("#delete-confirm-dialog");
    if (deleteDialog) {
      deleteDialog.addEventListener("cancel", event => { event.preventDefault(); closeDeleteConfirmation(); });
      deleteDialog.addEventListener("click", event => { if (event.target === deleteDialog) closeDeleteConfirmation(); });
    }
    $("#close-atlas-help")?.addEventListener("click", () => closeAtlasHelp());
    $("#understand-atlas-help")?.addEventListener("click", () => closeAtlasHelp());
    const atlasHelpDialog = $("#atlas-help-dialog");
    if (atlasHelpDialog) {
      atlasHelpDialog.addEventListener("cancel", event => { event.preventDefault(); closeAtlasHelp(); });
      atlasHelpDialog.addEventListener("click", event => { if (event.target === atlasHelpDialog) closeAtlasHelp(); });
    }
    $("#open-studio-guide")?.addEventListener("click", event => openStudioGuide(event.currentTarget));
    $("#close-studio-guide")?.addEventListener("click", () => closeStudioGuide());
    $("#start-studio-guide")?.addEventListener("click", () => closeStudioGuide());
    const guideDialog = $("#studio-guide-dialog");
    if (guideDialog) {
      guideDialog.addEventListener("cancel", event => { event.preventDefault(); closeStudioGuide(); });
      guideDialog.addEventListener("click", event => { if (event.target === guideDialog) closeStudioGuide(); });
    }
    $("#studio-retry").addEventListener("click", () => location.reload());
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
    I18n.setLocale("en");
    if (!projectId) return setState("Incomplete Studio link", "Project ID not found.", false);
    if (!token) return setState("Invalid magic link", "Please reopen the original Studio link containing the token.", false);
    try { const payload = await api.getStudio(); draft = Project.normalizeProject(payload.project, projectId); if (!draft.settings?.language || (draft.settings.language === "id" && !draft.identity?.recipient && !draft.identity?.sender && draft.status === "draft" && (!draft.updatedAt || draft.updatedAt === draft.createdAt))) { Project.changeLanguage(draft, "en"); } const isStaticLocal = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "3100"; giftUrl = isStaticLocal ? `${location.origin}/gift/index.html?project=${encodeURIComponent(projectId)}` : (payload.giftUrl || `${location.origin}/gift/${projectId}`); published = draft.status === "published"; catalog = await fetch("/assets/data/music.json").then(response => response.ok ? response.json() : []).catch(() => []); ensurePreviewTriggers(); bind(); const fullPreview = $("#gift-preview"); if (fullPreview) { fullPreview.addEventListener("load", () => { fullPreviewLoaded = true; sendPreview({ immediate: true }); }); fullPreview.src = previewGiftSrc(); } renderFields(); $("#studio-state").hidden = true; $("#studio-app").hidden = false; saveIndicator("saved"); try { if (!localStorage.getItem(`storybook:guide:${projectId}`) && !localStorage.getItem("storybook:guide:seen")) { requestAnimationFrame(() => openStudioGuide()); } } catch {} } catch (error) { setState("Studio cannot be opened", error.message, true); }
  }
  initialize();
})();
