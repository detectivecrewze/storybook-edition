(function () {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const Project = window.StorybookProject;
  const Themes = window.StorybookThemes;
  const I18n = window.StorybookI18n;
  const screens = $$(".screen");
  const app = $("#gift-app");
  const stateBox = $("#app-state");
  const roomContent = $("#room-content");
  const storyAudio = $("#story-audio");
  let project;
  let theme;
  let currentRoom = "";
  let roomCleanup = () => {};
  let roomResize = () => {};
  let activeTrackIndex = 0;
  const transitionTimers = new Set();
  const loadedResources = new Map();
  const panelImageState = new Map();
  let panelPrefetchHandle = 0;
  let lastTrigger = null;
  const opened = new Set();
  let atlasVisited = false;
  function isFirstAtlasVisit() {
    // Keep the opening journey special on a fresh gift load, but do not replay
    // it when someone returns to Atlas from this page's story menu.
    const first = !atlasVisited;
    atlasVisited = true;
    return first;
  }

  function showState(title, message, retry = false) {
    stateBox.hidden = false; app.hidden = true;
    $("[data-state-title]", stateBox).textContent = title;
    $("[data-state-message]", stateBox).textContent = message;
    $("[data-retry]", stateBox).hidden = !retry;
  }
  function setImage(image, source, alt, onError) {
    if (!image || !source) { if (image) image.hidden = true; return; }
    image.src = source; image.alt = alt || ""; image.hidden = false;
    image.onerror = () => { image.hidden = true; image.removeAttribute("src"); onError?.(); };
  }
  function showScreen(id, { focus = true } = {}) {
    screens.forEach(screen => screen.classList.toggle("is-active", screen.id === id));
    if (focus) requestAnimationFrame(() => {
      const screenEl = $(`#${id}`);
      if (!screenEl) return;
      const target = $("button:not([disabled]), h1, h2", screenEl);
      if (!target) return;
      if (/^H[12]$/.test(target.tagName)) {
        target.tabIndex = -1;
        target.style.outline = "none";
      }
      target.focus({ preventScroll: true });
    });
  }
  function trackTimeout(callback, delay) {
    const timer = setTimeout(() => { transitionTimers.delete(timer); callback(); }, delay);
    transitionTimers.add(timer); return timer;
  }
  function clearOpeningTransition() {
    transitionTimers.forEach(clearTimeout); transitionTimers.clear();
    const overlay = $("#comic-transition");
    overlay.classList.remove("is-revealing", "is-opening"); overlay.hidden = true;
  }
  function prefetchOpeningPanels() {
    const themePanels = theme?.assets?.openingPanels || [];
    const sources = Array.from({ length: 4 }, (_, index) => project?.opening?.panelImages?.[index] || themePanels[index] || "").filter(Boolean);
    const load = () => sources.forEach(source => {
      if (panelImageState.has(source)) return;
      panelImageState.set(source, "loading");
      const image = new Image();
      image.onload = () => panelImageState.set(source, "ready");
      image.onerror = () => panelImageState.set(source, "failed");
      image.src = source;
    });
    panelPrefetchHandle = "requestIdleCallback" in window ? requestIdleCallback(load, { timeout: 1800 }) : setTimeout(load, 650);
  }
  function applyOpeningPanelImages() {
    const themePanels = theme?.assets?.openingPanels || [];
    $$(".comic-transition-panel").forEach((panel, index) => {
      const source = project?.opening?.panelImages?.[index] || themePanels[index] || "";
      panel.classList.toggle("has-photo", Boolean(source) && panelImageState.get(source) !== "failed");
      if (source && panelImageState.get(source) !== "failed") panel.style.setProperty("--panel-photo", `url('${source.replaceAll("'", "%27")}')`);
      else panel.style.removeProperty("--panel-photo");
    });
  }
  function runOpeningTransition() {
    clearOpeningTransition();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { showScreen("greeting"); return; }
    const overlay = $("#comic-transition");
    applyOpeningPanelImages();
    $("#comic-transition-copy").textContent = project?.settings?.language === "en" ? "A LITTLE STORY FOR YOU" : "CERITA KECIL UNTUKMU";
    overlay.hidden = false;
    trackTimeout(() => overlay.classList.add("is-revealing"), 350);
    trackTimeout(() => showScreen("greeting", { focus: false }), 2800);
    trackTimeout(() => overlay.classList.add("is-opening"), 2820);
    trackTimeout(() => { overlay.hidden = true; overlay.classList.remove("is-revealing", "is-opening"); showScreen("greeting"); }, 4200);
  }
  function loadResource(url, type) {
    const key = `${type}:${url}`;
    if (loadedResources.has(key)) return loadedResources.get(key);
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement(type === "style" ? "link" : "script");
      if (type === "style") { node.rel = "stylesheet"; node.href = url; }
      else { node.src = url; node.defer = true; }
      node.onload = () => resolve(node); node.onerror = () => { loadedResources.delete(key); node.remove(); reject(new Error(`Gagal memuat ${url}`)); };
      document.head.append(node);
    });
    loadedResources.set(key, promise); return promise;
  }
  function availableTracks() { return project?.music?.tracks?.filter(track => track.audioUrl) || []; }
  function loadStoryTrack(index, autoplay = false) {
    const tracks = availableTracks(); if (!tracks.length) return;
    activeTrackIndex = (index + tracks.length) % tracks.length; const track = tracks[activeTrackIndex];
    const resolved = new URL(track.audioUrl, location.href).href;
    if (storyAudio.src !== resolved) { storyAudio.src = track.audioUrl; storyAudio.load(); }
    storyAudio.loop = tracks.length === 1;
    if (autoplay) storyAudio.play().catch(() => {});
  }
  function startOpeningMusic() { storyAudio.volume = .78; loadStoryTrack(0, true); storyAudio.loop = true; }
  function applyTheme() {
    theme = Themes.applyTheme(project.themeId);
    $("#theme-stylesheet").href = theme.stylesheet;
    document.body.style.setProperty("--surface-texture", `url('${theme.textures.surface}')`);
    document.body.style.setProperty("--paper-texture", `url('${theme.textures.paper}')`);
    // Browser chrome stays neutral white on iPhone. The themed surface belongs
    // to the gift canvas only, never to the status or home-indicator safe area.
    $("meta[name='theme-color']").content = "#ffffff";
    const giftWrap = $("#open-wrap");
    giftWrap.classList.toggle("has-gift-art", Boolean(theme.assets.giftBox));
    setImage($("#gift-box-art"), theme.assets.giftBox, "", () => giftWrap.classList.remove("has-gift-art"));
    const finaleCompanion = $("#finale-companion");
    finaleCompanion.removeAttribute("src");
    finaleCompanion.hidden = true;
  }
  function prepareGreeting() { setImage($("#greeting-art"), theme.assets.greeting, `${theme.label} greeting illustration`); }
  function prepareFinale() { setImage($("#finale-art"), theme.assets.finale, `${theme.label} finale illustration`); setImage($("#finale-companion"), theme.assets.finaleCompanion, `${theme.label} finale companion`); $("#finale-skyline").style.backgroundImage = `url('${theme.assets.skyline}')`; }
  function renderStaticCopy() {
    I18n.setLocale(project.settings.language); I18n.apply();
    $("#opening-eyebrow").textContent = project.opening.eyebrow;
    $("#greeting-title").textContent = project.opening.title;
    $("#opening-message").textContent = project.opening.message;
    $("#recipient-name").textContent = project.identity.recipient;
    $("#menu-recipient").textContent = project.identity.recipient;
    $("#menu-sender").textContent = project.identity.sender;
    $("#finale-title").textContent = project.finale.title;
    $("#finale-message").textContent = project.finale.message;
    $("#finale-signoff").textContent = project.finale.signoff;
    $("#finale-sender").textContent = project.identity.sender;
    document.title = `${project.identity.recipient || "Storybook"} · Storybook Edition`;
  }
  function enabledModules() { return project.modules.filter(module => module.enabled).sort((a, b) => a.order - b.order); }
  function renderMenuCharacters() {
    const config = theme?.assets?.menuCharacters;
    const row = $(".menu-title-row");
    if (row) row.classList.toggle("has-menu-characters", Boolean(config?.left || config?.right));
    [["left", $("#menu-character-left")], ["right", $("#menu-character-right")]].forEach(([side, slot]) => {
      slot.replaceChildren();
      slot.hidden = !config?.[side];
      if (!config?.[side]) return;
      const image = document.createElement("img");
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      image.className = side === "right" && config.mirrorRight ? "is-mirrored" : "";
      image.addEventListener("error", () => { slot.replaceChildren(); slot.hidden = true; }, { once: true });
      image.src = config[side];
      slot.append(image);
    });
  }
  function renderMenu() {
    renderMenuCharacters();
    const grid = $("#module-grid"); grid.replaceChildren();
    enabledModules().forEach((module, index) => {
      const fragment = $("#module-card-template").content.cloneNode(true);
      const button = $(".module-card", fragment);
      button.dataset.module = module.type;
      button.style.setProperty("--card-index", index);
      button.classList.toggle("is-opened", opened.has(module.type));
      $(".module-number", fragment).textContent = String(index + 1).padStart(2, "0");
      $(".module-copy strong", fragment).textContent = module.title;
      $(".module-copy small", fragment).textContent = module.subtitle;
      setImage($(".module-icon", fragment), theme.assets[module.type], "");
      button.addEventListener("click", () => openRoom(module, button));
      grid.append(fragment);
    });
    const ready = enabledModules().every(module => opened.has(module.type));
    $("#finale-launch").disabled = !ready;
  }
  function openRoom(module, trigger, { preview = false } = {}) {
    roomCleanup(); roomCleanup = () => {}; roomResize = () => {};
    lastTrigger = trigger || lastTrigger; currentRoom = module.type; if (!preview) opened.add(module.type);
    $("#room-kicker").textContent = `${I18n.t("gift.open")} ${String(module.order + 1).padStart(2, "0")}`;
    $("#room-title").textContent = module.title; $("#room-subtitle").textContent = module.subtitle;
    roomContent.replaceChildren();
    const renderers = { reasons: renderReasons, gallery: renderGallery, atlas: renderAtlas, music: renderMusic, letter: renderLetter };
    roomCleanup = renderers[module.type]?.() || (() => {}); roomResize = roomCleanup.resize || (() => {});
    showScreen("room", { focus: false });
    if (!preview) requestAnimationFrame(() => $("#room-back").focus({ preventScroll: true }));
  }
  function returnToMenu() { roomCleanup(); roomCleanup = () => {}; roomResize = () => {}; renderMenu(); showScreen("menu", { focus: false }); requestAnimationFrame(() => lastTrigger?.focus({ preventScroll: true })); }

  function renderReasons() {
    const list = document.createElement("div"); list.className = "reasons-grid";
    const items = project.reasons.items.length ? project.reasons.items : [I18n.t("gift.empty")];
    items.forEach((reason, index) => {
      const card = document.createElement("article"); card.className = "reason-card"; card.style.setProperty("--reason-index", index);
      card.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><p></p>`; $("p", card).textContent = reason; list.append(card);
    });
    roomContent.append(list); return () => {};
  }
  function renderGallery() {
    const items = project.gallery.items.filter(item => item.mediaUrl);
    if (!items.length) { roomContent.textContent = I18n.t("gift.empty"); return () => {}; }
    let index = 0; let resumeMusic = false; let touchStartX = 0; let touchStartY = 0;
    const shell = document.createElement("div"); shell.className = "gallery-view";
    shell.innerHTML = `<button class="round-button gallery-prev" type="button" aria-label="${I18n.t("gift.galleryPrev")}">←</button><article class="polaroid polaroid-current"><div class="gallery-media"></div><figcaption><h3></h3><p></p><div class="gallery-count"></div></figcaption></article><button class="round-button gallery-next" type="button" aria-label="${I18n.t("gift.galleryNext")}">→</button><div class="gallery-dots" aria-label="Choose a memory"></div>`;
    const mediaHost = $(".gallery-media", shell);
    function stopCurrent() { const video = $("video", mediaHost); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } mediaHost.replaceChildren(); if (resumeMusic) { storyAudio.play().catch(() => {}); resumeMusic = false; } }
    function draw() {
      stopCurrent(); const item = items[index]; let media;
      if (item.mediaType === "video") {
        media = document.createElement("video"); media.controls = true; media.playsInline = true; media.preload = "metadata"; media.src = item.mediaUrl;
        media.addEventListener("play", () => { resumeMusic = !storyAudio.paused; if (resumeMusic) storyAudio.pause(); });
        media.addEventListener("pause", () => { if (resumeMusic) { storyAudio.play().catch(() => {}); resumeMusic = false; } });
      } else { media = document.createElement("img"); media.loading = "eager"; media.alt = item.title || "Memory"; media.src = item.mediaUrl; }
      mediaHost.append(media); $("h3", shell).textContent = item.title || `Memory ${index + 1}`; const captionNode = $("p", shell); captionNode.textContent = item.caption || ""; captionNode.style.display = item.caption ? "" : "none"; $(".gallery-count", shell).textContent = `${index + 1} / ${items.length}`;
      $$(".gallery-dots button", shell).forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
      $(".polaroid-current", shell).animate?.([{ opacity: .35, transform: "translateX(12px) rotate(.8deg)" }, { opacity: 1, transform: "rotate(-.65deg)" }], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 260, easing: "ease-out" });
      $(".gallery-prev", shell).disabled = items.length < 2; $(".gallery-next", shell).disabled = items.length < 2;
    }
    const move = delta => { index = (index + delta + items.length) % items.length; draw(); };
    $(".gallery-prev", shell).addEventListener("click", () => move(-1)); $(".gallery-next", shell).addEventListener("click", () => move(1));
    items.forEach((_, dotIndex) => { const dot = document.createElement("button"); dot.type = "button"; dot.setAttribute("aria-label", `Memory ${dotIndex + 1}`); dot.addEventListener("click", () => { index = dotIndex; draw(); }); $(".gallery-dots", shell).append(dot); });
    shell.addEventListener("touchstart", event => { touchStartX = event.changedTouches[0].clientX; touchStartY = event.changedTouches[0].clientY; }, { passive: true });
    shell.addEventListener("touchend", event => { const distanceX = event.changedTouches[0].clientX - touchStartX; const distanceY = event.changedTouches[0].clientY - touchStartY; if (Math.abs(distanceX) > 45 && Math.abs(distanceX) > Math.abs(distanceY) * 1.2) move(distanceX > 0 ? -1 : 1); }, { passive: true });
    roomContent.append(shell); draw(); return stopCurrent;
  }
  function renderAtlas() {
    let disposed = false; let cleanup = () => {};
    const firstVisit = isFirstAtlasVisit();
    const loading = document.createElement("div"); loading.className = "atlas-loading"; loading.setAttribute("role", "status"); loading.textContent = project.settings.language === "en" ? "Drawing your map…" : "Menggambar peta kalian…"; roomContent.append(loading);
    Promise.all([
      window.L ? Promise.resolve() : loadResource("/assets/vendor/leaflet/leaflet.js", "script"),
      window.StorybookAtlasRoom ? Promise.resolve() : loadResource("/rooms/atlas.js", "script")
    ]).then(() => {
      if (disposed) return;
      roomContent.replaceChildren();
      cleanup = window.StorybookAtlasRoom.mount(roomContent, project.atlas, { language: project.settings.language, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, cinematic: firstVisit });
    }).catch(() => {
      if (disposed) return;
      const fallback = document.createElement("section"); fallback.className = "atlas-static-fallback";
      const title = document.createElement("h3"); title.textContent = project.settings.language === "en" ? "Your places are still safe" : "Tempat kalian tetap tersimpan";
      const message = document.createElement("p"); message.textContent = project.settings.language === "en" ? "The interactive map could not load. You can still read every saved place below." : "Peta interaktif belum dapat dimuat. Semua lokasi yang tersimpan tetap bisa dibaca di bawah ini.";
      const list = document.createElement("ol");
      (project.atlas?.locations || []).filter(location => location?.label).forEach(location => { const item = document.createElement("li"); const label = document.createElement("strong"); label.textContent = location.label; item.append(label); if (location.note) { const note = document.createElement("span"); note.textContent = location.note; item.append(note); } list.append(item); });
      fallback.append(title, message, list); roomContent.replaceChildren(fallback);
    });
    const dispose = () => { disposed = true; cleanup?.(); };
    dispose.resize = () => cleanup?.resize?.();
    return dispose;
  }

  function renderMusic() {
    const tracks = availableTracks();
    if (!tracks.length) { roomContent.textContent = I18n.t("gift.empty"); return () => {}; }
    let active = Math.min(activeTrackIndex, tracks.length - 1);
    const player = document.createElement("div"); player.className = "music-player";
    player.innerHTML = `<div class="music-poster"><span class="poster-tape" aria-hidden="true"></span><div class="vinyl-disc" aria-hidden="true"><span>FOR<br>YOU</span></div><div class="album-art"><img alt="" hidden><span>♫</span></div></div><div class="music-panel"><div class="track-copy"><small>SONG DEDICATED FOR YOU · <b></b></small><h3></h3><p></p></div><blockquote class="song-note" hidden><span class="song-note__label"></span><p class="song-note__text"></p></blockquote><p class="music-error" role="status" hidden></p><div class="progress-row"><span class="current-time">0:00</span><input class="seek" type="range" min="0" max="100" value="0" aria-label="Song progress"><span class="duration-time">0:00</span></div><div class="player-controls"><button class="round-button track-prev" type="button" aria-label="Previous song">←</button><button class="play-button" type="button" aria-label="Play"><span>▶</span></button><button class="round-button track-next" type="button" aria-label="Next song">→</button></div><div class="playlist"></div></div>`;
    function renderSongNote(value) { const quote = typeof value === "string" ? value.trim() : ""; $(".song-note__label", player).textContent = I18n.t("gift.songNote"); $(".song-note__text", player).textContent = quote; $(".song-note", player).hidden = !quote; }
    function showAudioError() { const error = $(".music-error", player); error.textContent = I18n.t("gift.audioError"); error.hidden = false; }
    function playActiveTrack() { $(".music-error", player).hidden = true; return storyAudio.play().catch(error => { if (error?.name !== "NotAllowedError") showAudioError(); }); }
    function select(index, autoplay = false) {
      active = (index + tracks.length) % tracks.length; const track = tracks[active]; $(".music-error", player).hidden = true; loadStoryTrack(active, false);
      $(".track-copy b", player).textContent = `${active + 1} / ${tracks.length}`; $(".track-copy h3", player).textContent = track.title; $(".track-copy p", player).textContent = track.artist; renderSongNote(track.quote);
      const placeholder = $(".album-art span", player); placeholder.hidden = false;
      $(".album-art img", player).onload = () => { placeholder.hidden = true; };
      setImage($(".album-art img", player), track.coverUrl, track.title, () => { placeholder.hidden = false; });
      $$(".playlist button", player).forEach((button, buttonIndex) => button.classList.toggle("is-active", buttonIndex === active)); if (autoplay) playActiveTrack();
    }
    tracks.forEach((track, index) => { const button = document.createElement("button"); button.type = "button"; button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong></strong><small></small>`; $("strong", button).textContent = track.title; $("small", button).textContent = track.artist; button.addEventListener("click", () => select(index, true)); $(".playlist", player).append(button); });
    $(".play-button", player).addEventListener("click", () => storyAudio.paused ? playActiveTrack() : storyAudio.pause());
    $(".track-prev", player).addEventListener("click", () => select(active - 1, true)); $(".track-next", player).addEventListener("click", () => select(active + 1, true));
    const formatTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}` : "0:00";
    const syncPlay = () => { const playing = !storyAudio.paused; $(".play-button span", player).textContent = playing ? "Ⅱ" : "▶"; $(".vinyl-disc", player).classList.toggle("is-playing", playing); };
    const syncTime = () => { $(".seek", player).value = storyAudio.duration ? String((storyAudio.currentTime / storyAudio.duration) * 100) : "0"; $(".current-time", player).textContent = formatTime(storyAudio.currentTime); $(".duration-time", player).textContent = formatTime(storyAudio.duration); };
    const ended = () => { if (tracks.length > 1) select(active + 1, true); else syncPlay(); }; storyAudio.addEventListener("play", syncPlay); storyAudio.addEventListener("pause", syncPlay); storyAudio.addEventListener("timeupdate", syncTime); storyAudio.addEventListener("loadedmetadata", syncTime); storyAudio.addEventListener("ended", ended); storyAudio.addEventListener("error", showAudioError);
    $(".seek", player).addEventListener("input", event => { if (storyAudio.duration) storyAudio.currentTime = storyAudio.duration * Number(event.target.value) / 100; });
    roomContent.append(player); select(active); syncPlay(); syncTime(); return () => { if (tracks.length > 1) storyAudio.loop = true; storyAudio.removeEventListener("play", syncPlay); storyAudio.removeEventListener("pause", syncPlay); storyAudio.removeEventListener("timeupdate", syncTime); storyAudio.removeEventListener("loadedmetadata", syncTime); storyAudio.removeEventListener("ended", ended); storyAudio.removeEventListener("error", showAudioError); };
  }
  function renderLetter() {
    let timer = 0; let revealTimer = 0; const shell = document.createElement("div"); shell.className = "letter-experience";
    shell.innerHTML = `<button class="envelope" type="button" aria-label="Open letter"><span class="envelope-flap"></span><span class="envelope-seal">✦</span></button><article class="letter-paper" hidden><h3></h3><div class="letter-body"></div><p class="letter-signoff"></p><button class="text-button" type="button" data-i18n="gift.fullLetter">Tampilkan seluruh surat</button></article>`;
    const paper = $(".letter-paper", shell); const body = $(".letter-body", shell); const signoff = $(".letter-signoff", paper);
    const bodyText = (project.letter?.paragraphs || []).join("\n\n"); const signoffText = project.letter?.signoff || "";
    const pauseTicks = bodyText && signoffText ? 10 : 0; const totalLength = bodyText.length + pauseTicks + signoffText.length;
    let cursor = 0;
    const showFull = () => { clearInterval(timer); body.replaceChildren(...(project.letter?.paragraphs || []).map(value => { const p = document.createElement("p"); p.textContent = value; return p; })); signoff.textContent = signoffText; $(".text-button", paper).hidden = true; };
    $(".envelope", shell).addEventListener("click", () => { $(".envelope", shell).classList.add("is-open"); revealTimer = setTimeout(() => { $(".envelope", shell).hidden = true; paper.hidden = false; if (matchMedia("(prefers-reduced-motion: reduce)").matches) return showFull(); if (totalLength === 0) return showFull(); timer = setInterval(() => { cursor++; if (cursor <= bodyText.length) { body.textContent = bodyText.slice(0, cursor); } else if (cursor <= bodyText.length + pauseTicks) { body.textContent = bodyText; signoff.textContent = ""; } else { body.textContent = bodyText; const signoffCursor = cursor - (bodyText.length + pauseTicks); signoff.textContent = signoffText.slice(0, signoffCursor); } if (cursor >= totalLength) showFull(); }, 18); }, 480); });
    $("h3", paper).textContent = project.letter?.greeting || ""; signoff.textContent = ""; $(".text-button", paper).addEventListener("click", showFull); I18n.apply(shell);
    roomContent.append(shell); return () => { clearInterval(timer); clearTimeout(revealTimer); };
  }

  function preloadAtlasScripts() {
    // Preload Leaflet and atlas room JS in the background so no script inject
    // happens when the user taps the Atlas chapter (eliminating the refresh feel on iOS).
    const idleLoad = () => {
      if (!window.L) loadResource("/assets/vendor/leaflet/leaflet.js", "script").catch(() => {});
      if (!window.StorybookAtlasRoom) loadResource("/rooms/atlas.js", "script").catch(() => {});
    };
    if ("requestIdleCallback" in window) requestIdleCallback(idleLoad, { timeout: 3000 });
    else setTimeout(idleLoad, 1500);
  }

  function renderAll() { clearOpeningTransition(); if (panelPrefetchHandle) { "cancelIdleCallback" in window ? cancelIdleCallback(panelPrefetchHandle) : clearTimeout(panelPrefetchHandle); panelPrefetchHandle = 0; } roomCleanup(); roomCleanup = () => {}; roomResize = () => {}; storyAudio.pause(); storyAudio.removeAttribute("src"); storyAudio.load(); activeTrackIndex = 0; opened.clear(); atlasVisited = false; $("#open-wrap").classList.remove("is-opening"); $("#greeting-art").removeAttribute("src"); $("#greeting-art").hidden = true; $("#finale-art").removeAttribute("src"); $("#finale-art").hidden = true; $("#finale-skyline").style.backgroundImage = ""; $("#module-grid").replaceChildren(); $("#menu-character-left").replaceChildren(); $("#menu-character-right").replaceChildren(); applyTheme(); renderStaticCopy(); prefetchOpeningPanels(); preloadAtlasScripts(); }

  async function loadGift() {
    const projectId = Project.projectIdFromPath(location.pathname, location.search) || "sample-demo";
    try {
      const payload = await new window.StorybookApi(projectId).getPublicGift(); project = Project.normalizeProject(payload.project || payload, projectId); renderAll(); stateBox.hidden = true; app.hidden = false;
      const params = new URLSearchParams(location.search);
      if (params.get("example") === "1") previewTarget({ target: params.get("target") || "gate", roomType: params.get("roomType") || "" });
      else showScreen("gate", { focus: false });
    } catch (error) { showState("Gift belum bisa dibuka", error.status === 404 ? "Link tidak ditemukan atau gift belum dipublish." : error.message, true); }
  }
  $("[data-retry]").addEventListener("click", () => location.reload());
  $("#open-wrap").addEventListener("click", event => { if (event.currentTarget.classList.contains("is-opening")) return; prepareGreeting(); startOpeningMusic(); event.currentTarget.classList.add("is-opening"); runOpeningTransition(); });
  $("#enter-story").addEventListener("click", () => { renderMenu(); showScreen("menu"); });
  $("#room-back").addEventListener("click", returnToMenu);
  $("#finale-launch").addEventListener("click", () => { prepareFinale(); showScreen("finale"); });
  $("#replay-story").addEventListener("click", () => { clearOpeningTransition(); opened.clear(); atlasVisited = false; $("#open-wrap").classList.remove("is-opening"); renderMenu(); showScreen("gate"); });
  document.addEventListener("keydown", event => { if (event.key !== "Escape") return; if ($("#room").classList.contains("is-active")) returnToMenu(); else if ($("#finale").classList.contains("is-active")) showScreen("menu"); });
  function previewTarget(context) {
    const target = ["gate", "room", "menu", "finale"].includes(context?.target) ? context.target : "gate";
    if (target === "room") {
      const module = project?.modules?.find(entry => entry.type === context.roomType);
      if (module) return openRoom(module, null, { preview: true });
    }
    if (target === "menu") { roomCleanup(); roomCleanup = () => {}; renderMenu(); return showScreen("menu", { focus: false }); }
    if (target === "finale") { roomCleanup(); roomCleanup = () => {}; prepareFinale(); return showScreen("finale", { focus: false }); }
    showScreen("gate", { focus: false });
  }
  window.addEventListener("message", event => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === "storybook-preview-target" && event.data.context) {
      if (project) previewTarget(event.data.context);
      return;
    }
    if (event.data?.type !== "storybook-preview" || !event.data.project) return;
    project = Project.normalizeProject(event.data.project, event.data.project.projectId || "sample-demo");
    renderAll();
    stateBox.hidden = true;
    app.hidden = false;
    previewTarget(event.data.context);
  });
  window.addEventListener("resize", () => roomResize?.());
  window.addEventListener("pagehide", () => { clearOpeningTransition(); roomCleanup(); storyAudio.pause(); storyAudio.removeAttribute("src"); });
  if (new URLSearchParams(location.search).get("preview") === "1") showState("Menyiapkan preview...", "Studio sedang mengirim perubahan terbaru.");
  else loadGift();
})();
