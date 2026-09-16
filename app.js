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
  let transitionTimer = 0;
  let lastTrigger = null;
  const opened = new Set();

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
    if (focus) requestAnimationFrame(() => { const target = $("button:not([disabled]), h1, h2", $(`#${id}`)); if (!target) return; if (/^H[12]$/.test(target.tagName)) target.tabIndex = -1; target.focus({ preventScroll: true }); });
  }
  function applyTheme() {
    theme = Themes.applyTheme(project.themeId);
    $("#theme-stylesheet").href = theme.stylesheet;
    document.body.style.setProperty("--surface-texture", `url('${theme.textures.surface}')`);
    document.body.style.setProperty("--paper-texture", `url('${theme.textures.paper}')`);
    $("meta[name='theme-color']").content = theme.palette.primaryDark;
    setImage($("#opening-emblem"), theme.assets.openingEmblem, `${theme.label} gift emblem`);
  }
  function prepareGreeting() { setImage($("#greeting-art"), theme.assets.greeting, `${theme.label} greeting illustration`); }
  function prepareFinale() { setImage($("#finale-art"), theme.assets.finale, `${theme.label} finale illustration`); $("#finale-skyline").style.backgroundImage = `url('${theme.assets.skyline}')`; }
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
  function renderMenu() {
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
  function openRoom(module, trigger) {
    roomCleanup(); roomCleanup = () => {};
    lastTrigger = trigger; currentRoom = module.type; opened.add(module.type);
    $("#room-kicker").textContent = `${I18n.t("gift.open")} ${String(module.order + 1).padStart(2, "0")}`;
    $("#room-title").textContent = module.title; $("#room-subtitle").textContent = module.subtitle;
    roomContent.replaceChildren();
    const renderers = { reasons: renderReasons, gallery: renderGallery, music: renderMusic, letter: renderLetter };
    roomCleanup = renderers[module.type]?.() || (() => {});
    showScreen("room", { focus: false });
    requestAnimationFrame(() => $("#room-back").focus({ preventScroll: true }));
  }
  function returnToMenu() { roomCleanup(); roomCleanup = () => {}; renderMenu(); showScreen("menu", { focus: false }); requestAnimationFrame(() => lastTrigger?.focus({ preventScroll: true })); }

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
    shell.innerHTML = `<button class="round-button gallery-prev" type="button" aria-label="${I18n.t("gift.galleryPrev")}">←</button><article class="polaroid"><div class="gallery-media"></div><h3></h3><p></p><div class="gallery-count"></div></article><button class="round-button gallery-next" type="button" aria-label="${I18n.t("gift.galleryNext")}">→</button>`;
    const mediaHost = $(".gallery-media", shell);
    function stopCurrent() { const video = $("video", mediaHost); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } mediaHost.replaceChildren(); if (resumeMusic) { storyAudio.play().catch(() => {}); resumeMusic = false; } }
    function draw() {
      stopCurrent(); const item = items[index]; let media;
      if (item.mediaType === "video") {
        media = document.createElement("video"); media.controls = true; media.playsInline = true; media.preload = "metadata"; media.src = item.mediaUrl;
        media.addEventListener("play", () => { resumeMusic = !storyAudio.paused; if (resumeMusic) storyAudio.pause(); });
        media.addEventListener("pause", () => { if (resumeMusic) { storyAudio.play().catch(() => {}); resumeMusic = false; } });
      } else { media = document.createElement("img"); media.loading = "eager"; media.alt = item.title || "Memory"; media.src = item.mediaUrl; }
      mediaHost.append(media); $("h3", shell).textContent = item.title || `Memory ${index + 1}`; $("p", shell).textContent = item.caption; $(".gallery-count", shell).textContent = `${index + 1} / ${items.length}`;
      $(".gallery-prev", shell).disabled = items.length < 2; $(".gallery-next", shell).disabled = items.length < 2;
    }
    const move = delta => { index = (index + delta + items.length) % items.length; draw(); };
    $(".gallery-prev", shell).addEventListener("click", () => move(-1)); $(".gallery-next", shell).addEventListener("click", () => move(1));
    shell.addEventListener("touchstart", event => { touchStartX = event.changedTouches[0].clientX; touchStartY = event.changedTouches[0].clientY; }, { passive: true });
    shell.addEventListener("touchend", event => { const distanceX = event.changedTouches[0].clientX - touchStartX; const distanceY = event.changedTouches[0].clientY - touchStartY; if (Math.abs(distanceX) > 45 && Math.abs(distanceX) > Math.abs(distanceY) * 1.2) move(distanceX > 0 ? -1 : 1); }, { passive: true });
    roomContent.append(shell); draw(); return stopCurrent;
  }
  function renderMusic() {
    const tracks = project.music.tracks.filter(track => track.audioUrl);
    if (!tracks.length) { roomContent.textContent = I18n.t("gift.empty"); return () => {}; }
    let active = 0;
    const player = document.createElement("div"); player.className = "music-player";
    player.innerHTML = `<div class="album-art"><img alt="" hidden><span>♫</span></div><div class="track-copy"><small></small><h3></h3><p></p></div><input class="seek" type="range" min="0" max="100" value="0" aria-label="Song progress"><div class="player-controls"><button class="round-button track-prev" type="button">←</button><button class="play-button" type="button"><span>▶</span></button><button class="round-button track-next" type="button">→</button></div><div class="playlist"></div>`;
    function select(index, autoplay = false) {
      active = (index + tracks.length) % tracks.length; const track = tracks[active]; storyAudio.src = track.audioUrl; storyAudio.loop = false; storyAudio.load();
      $(".track-copy small", player).textContent = `${active + 1} / ${tracks.length}`; $(".track-copy h3", player).textContent = track.title; $(".track-copy p", player).textContent = track.artist;
      const placeholder = $(".album-art span", player); placeholder.hidden = Boolean(track.coverUrl);
      setImage($(".album-art img", player), track.coverUrl, track.title, () => { placeholder.hidden = false; });
      $$(".playlist button", player).forEach((button, buttonIndex) => button.classList.toggle("is-active", buttonIndex === active)); if (autoplay) storyAudio.play().catch(() => {});
    }
    tracks.forEach((track, index) => { const button = document.createElement("button"); button.type = "button"; button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong></strong><small></small>`; $("strong", button).textContent = track.title; $("small", button).textContent = track.artist; button.addEventListener("click", () => select(index, true)); $(".playlist", player).append(button); });
    $(".play-button", player).addEventListener("click", () => storyAudio.paused ? storyAudio.play().catch(() => {}) : storyAudio.pause());
    $(".track-prev", player).addEventListener("click", () => select(active - 1, true)); $(".track-next", player).addEventListener("click", () => select(active + 1, true));
    const syncPlay = () => { $(".play-button span", player).textContent = storyAudio.paused ? "▶" : "Ⅱ"; };
    const syncTime = () => { $(".seek", player).value = storyAudio.duration ? String((storyAudio.currentTime / storyAudio.duration) * 100) : "0"; };
    const ended = () => select(active + 1, true); storyAudio.addEventListener("play", syncPlay); storyAudio.addEventListener("pause", syncPlay); storyAudio.addEventListener("timeupdate", syncTime); storyAudio.addEventListener("ended", ended);
    $(".seek", player).addEventListener("input", event => { if (storyAudio.duration) storyAudio.currentTime = storyAudio.duration * Number(event.target.value) / 100; });
    roomContent.append(player); select(0); return () => { storyAudio.pause(); storyAudio.removeAttribute("src"); storyAudio.load(); storyAudio.removeEventListener("play", syncPlay); storyAudio.removeEventListener("pause", syncPlay); storyAudio.removeEventListener("timeupdate", syncTime); storyAudio.removeEventListener("ended", ended); };
  }
  function renderLetter() {
    let timer = 0; let revealTimer = 0; const shell = document.createElement("div"); shell.className = "letter-experience";
    shell.innerHTML = `<button class="envelope" type="button" aria-label="Open letter"><span class="envelope-flap"></span><span class="envelope-seal">✦</span></button><article class="letter-paper" hidden><h3></h3><div class="letter-body"></div><p class="letter-signoff"></p><button class="text-button" type="button" data-i18n="gift.fullLetter">Tampilkan seluruh surat</button></article>`;
    const paper = $(".letter-paper", shell); const body = $(".letter-body", shell); const full = project.letter.paragraphs.join("\n\n"); let cursor = 0;
    const showFull = () => { clearInterval(timer); body.replaceChildren(...project.letter.paragraphs.map(value => { const p = document.createElement("p"); p.textContent = value; return p; })); $(".text-button", paper).hidden = true; };
    $(".envelope", shell).addEventListener("click", () => { $(".envelope", shell).classList.add("is-open"); revealTimer = setTimeout(() => { $(".envelope", shell).hidden = true; paper.hidden = false; if (matchMedia("(prefers-reduced-motion: reduce)").matches) return showFull(); timer = setInterval(() => { body.textContent = full.slice(0, ++cursor); if (cursor >= full.length) showFull(); }, 18); }, 480); });
    $("h3", paper).textContent = project.letter.greeting; $(".letter-signoff", paper).textContent = project.letter.signoff; $(".text-button", paper).addEventListener("click", showFull); I18n.apply(shell);
    roomContent.append(shell); return () => { clearInterval(timer); clearTimeout(revealTimer); };
  }

  function renderAll() { clearTimeout(transitionTimer); roomCleanup(); roomCleanup = () => {}; storyAudio.pause(); storyAudio.removeAttribute("src"); opened.clear(); $("#open-wrap").classList.remove("is-opening"); $("#greeting-art").removeAttribute("src"); $("#greeting-art").hidden = true; $("#finale-art").removeAttribute("src"); $("#finale-art").hidden = true; $("#finale-skyline").style.backgroundImage = ""; $("#module-grid").replaceChildren(); applyTheme(); renderStaticCopy(); }
  async function loadGift() {
    const projectId = Project.projectIdFromPath(location.pathname, location.search) || "sample-demo";
    try {
      const payload = await new window.StorybookApi(projectId).getPublicGift(); project = Project.normalizeProject(payload.project || payload, projectId); renderAll(); stateBox.hidden = true; app.hidden = false; showScreen("gate", { focus: false });
    } catch (error) { showState("Gift belum bisa dibuka", error.status === 404 ? "Link tidak ditemukan atau gift belum dipublish." : error.message, true); }
  }
  $("[data-retry]").addEventListener("click", () => location.reload());
  $("#open-wrap").addEventListener("click", event => { prepareGreeting(); event.currentTarget.classList.add("is-opening"); clearTimeout(transitionTimer); transitionTimer = setTimeout(() => showScreen("greeting"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650); });
  $("#enter-story").addEventListener("click", () => { renderMenu(); showScreen("menu"); });
  $("#room-back").addEventListener("click", returnToMenu);
  $("#finale-launch").addEventListener("click", () => { prepareFinale(); showScreen("finale"); });
  $("#replay-story").addEventListener("click", () => { opened.clear(); $("#open-wrap").classList.remove("is-opening"); renderMenu(); showScreen("gate"); });
  document.addEventListener("keydown", event => { if (event.key !== "Escape") return; if ($("#room").classList.contains("is-active")) returnToMenu(); else if ($("#finale").classList.contains("is-active")) showScreen("menu"); });
  window.addEventListener("message", event => { if (event.origin !== location.origin || event.data?.type !== "storybook-preview" || !event.data.project) return; project = Project.normalizeProject(event.data.project, event.data.project.projectId || "sample-demo"); renderAll(); stateBox.hidden = true; app.hidden = false; showScreen("gate", { focus: false }); });
  window.addEventListener("pagehide", () => { clearTimeout(transitionTimer); roomCleanup(); storyAudio.pause(); storyAudio.removeAttribute("src"); });
  if (new URLSearchParams(location.search).get("preview") === "1") showState("Menyiapkan preview...", "Studio sedang mengirim perubahan terbaru.");
  else loadGift();
})();
