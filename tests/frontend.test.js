"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Studio contains the nine planned steps and shared gift preview renderer", () => {
  const html = read("studio/index.html"); const app = read("studio/app.js");
  assert.equal((html.match(/class="wizard-step/g) || []).length, 9);
  assert.match(app, /\/gift\/(?:index\.html\?project=\$\{encodeURIComponent\(projectId\)\}&preview=1|\$\{encodeURIComponent\(projectId\)\}\?preview=1)/);
  assert.match(app, /type: "storybook-preview"/);
  assert.match(html, /id="qr-code"/);
  assert.doesNotMatch(html + app, /wish inbox|reply card/i);
});

test("Studio gives media and Atlas controls a visible, resilient editing path", () => {
  const html = read("studio/index.html"); const app = read("studio/app.js"); const mock = read("dev/mock-api.js");
  assert.match(html, /id="atlas-enabled"/);
  assert.match(html, /gallery-upload-status/);
  assert.match(html, /atlas-upload-status/);
  assert.equal((html.match(/data-reasons-preset=/g) || []).length, 3);
  assert.equal((html.match(/data-letter-preset=/g) || []).length, 3);
  assert.match(app, /function galleryUploadStatus/);
  assert.match(app, /function atlasUploadStatus/);
  assert.match(app, /function mediaKind/);
  assert.match(app, /function withOriginalImageFallback/);
  assert.match(app, /function draftSnapshot/);
  assert.match(app, /requestRevision !== draftRevision/);
  assert.match(app, /draft\.gallery\.items\.find\(entry => entry\.id === itemId\)/);
  assert.match(app, /draft\.atlas\.locations\.find\(entry => entry\.id === locationId\)/);
  assert.match(html, /id="photo-crop-dialog"/);
  assert.match(app, /function openPhotoCropper/);
  assert.match(app, /aspectRatio:\s*1/);
  assert.match(app, /aspectRatio:\s*4\s*\/\s*3/);
  assert.match(app, /function syncAtlasCard/);
  assert.match(app, /function syncGalleryCard/);
  assert.match(mock, /URL\.createObjectURL\(file\)/);
  assert.doesNotMatch(mock, /readAsDataURL/);
});

test("Atlas help is contextual, localized, and replaces the oversized overview tip", () => {
  const html = read("studio/index.html"); const app = read("studio/app.js"); const css = read("studio/styles.css");
  assert.match(html, /id="atlas-help-dialog"/); assert.match(html, /data-atlas-help/);
  assert.doesNotMatch(html, /class="atlas-studio-note"/);
  assert.match(app, /function openAtlasHelp/); assert.match(app, /function closeAtlasHelp/);
  assert.match(css, /\.atlas-help-trigger/); assert.match(css, /\.atlas-help-dialog/);
});

test("gift opening keeps the full gift box as its only clean click target", () => {
  const html = read("gift/index.html"); const css = read("styles.css");
  assert.match(html, /id="open-wrap"/); assert.doesNotMatch(html, /class="gift-open-cue"/);
  assert.doesNotMatch(html, /class="tap-copy"/); assert.doesNotMatch(css, /openCuePulse|gift-open-cue/);
});

test("iPhone browser chrome stays white while the themed gift canvas respects safe areas", () => {
  const html = read("gift/index.html"); const app = read("app.js"); const css = read("styles.css");
  assert.match(html, /name="theme-color" content="#ffffff"/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="default"/);
  assert.match(app, /meta\[name='theme-color'\]\"\)\.content = "#ffffff"/);
  assert.match(css, /--viewport-safe-top: env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /\.screen \{ position: fixed; inset: var\(--viewport-safe-top\) 0 var\(--viewport-safe-bottom\); \}/);
  assert.match(css, /html, body \{ width: 100%; min-height: 100dvh; margin: 0; background: #fff; \}/);
});

test("Studio allows dynamic Memory Archive section title and subtitle editing", () => {
  const html = read("studio/index.html"); const app = read("studio/app.js");
  assert.match(html, /id="gallery-module-title"/);
  assert.match(html, /id="gallery-module-subtitle"/);
  assert.match(html, /id="gallery-step-heading"/);
  assert.match(html, /id="gallery-step-nav-label"/);
  assert.match(app, /function updateGalleryTitleUI/);
  assert.match(app, /gallery-module-title/);
  assert.match(app, /gallery-module-subtitle/);
});

test("gift renderer is theme-neutral and customer media is constructed inside rooms", () => {
  const app = read("app.js");
  assert.match(app, /Themes\.applyTheme\(project\.themeId\)/);
  assert.doesNotMatch(app, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  assert.match(app, /function renderGallery/); assert.match(app, /function renderMusic/); assert.match(app, /function renderLetter/);
  assert.match(app, /function renderAtlas/);
  assert.match(app, /get\("preview"\) === "1"/);
});

test("gallery videos autoplay silently in a loop as live photos without interrupting soundtrack", () => {
  const app = read("app.js");
  const styles = read("styles.css");
  assert.match(app, /item\.mediaType === "video"/);
  assert.match(app, /media\.autoplay = true/);
  assert.match(app, /media\.loop = true/);
  assert.match(app, /media\.muted = true/);
  assert.match(app, /media\.playsInline = true/);
  assert.match(app, /media\.controls = false/);
  assert.match(styles, /\.gallery-media video\s*\{[^}]*object-fit:\s*cover/);
});

test("menu character decorations are theme-driven and remain lazy until the menu renders", () => {
  const html = read("gift/index.html"); const app = read("app.js"); const themes = read("shared/themes.js");
  const giftBody = html.slice(html.indexOf("</head>") + "</head>".length);
  assert.match(html, /id="menu-character-left"/); assert.match(html, /id="menu-character-right"/);
  assert.match(html, /id="finale-companion"/); assert.match(app, /theme\.assets\.finaleCompanion/);
  assert.doesNotMatch(giftBody, /spiderman-tom-holland\.gif/);
  assert.match(app, /function renderMenuCharacters/); assert.match(app, /theme\?\.assets\?\.menuCharacters/);
  assert.doesNotMatch(app, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  assert.match(themes, /menuCharacters/);
});

test("Atlas resources are preloaded silently and JS remains lazy until the room is opened", () => {
  const html = read("gift/index.html"); const app = read("app.js"); const build = read("build.mjs");
  // Leaflet JS must NOT be in a blocking <script> tag — it stays lazy via app.js loadResource.
  assert.doesNotMatch(html, /<script[^>]+leaflet/i);
  // Preload hints must exist so the browser fetches assets before the user taps Atlas.
  assert.match(html, /rel="preload"[^>]+leaflet/i);
  // app.js must still contain the conditional loadResource calls for JS (lazy fallback).
  assert.match(app, /\/assets\/vendor\/leaflet\/leaflet\.js/);
  assert.match(app, /\/rooms\/atlas\.js/);
  assert.match(build, /"rooms"/);
  assert.equal(fs.existsSync(path.join(root, "assets/vendor/leaflet/leaflet.js")), true);
  assert.equal(fs.existsSync(path.join(root, "rooms/atlas.js")), true);
});

test("manifest assets exist and remain inside the theme performance budget", () => {
  const Themes = require("../shared/themes.js");
  Object.values(Themes.THEMES).forEach(theme => {
    const urls = [...new Set([theme.thumbnail, theme.textures.surface, theme.textures.paper, ...Object.values(theme.assets).flatMap(value => Array.isArray(value) ? value : [value])].filter(value => typeof value === "string" && value.startsWith("/")))];
    let total = 0;
    for (const url of urls) { const file = path.join(root, url.replace(/^\//, "")); assert.equal(fs.existsSync(file), true, url); const size = fs.statSync(file).size; total += size; assert.ok(size <= 250 * 1024, `${url} is ${(size / 1024).toFixed(1)} KB`); }
    assert.ok(total <= 1024 * 1024, `${theme.id} theme manifest totals ${(total / 1024).toFixed(1)} KB`);
  });
});

test("gift and Studio favicons follow the active theme manifest", () => {
  const gift = read("gift/index.html"); const studio = read("studio/index.html"); const themes = read("shared/themes.js");
  assert.match(gift, /rel="icon" data-theme-favicon/);
  assert.match(studio, /rel="icon" data-theme-favicon/);
  assert.match(themes, /const applyThemeFavicon/);
  assert.match(themes, /theme\.assets\.favicon \|\| theme\.thumbnail/);
  Object.values(require("../shared/themes.js").THEMES).forEach(theme => assert.ok(String(theme.assets.favicon || "").trim(), `${theme.id} needs a favicon`));
});

test("theme runtime artwork stays local and does not depend on Tenor", () => {
  const studio = read("studio/index.html"); const themesSource = read("shared/themes.js");
  const Themes = require("../shared/themes.js");
  assert.doesNotMatch(studio + themesSource, /media\.tenor\.com/i);
  Object.values(Themes.THEMES).forEach(theme => {
    const runtimeImages = [theme.assets.favicon, ...Object.values(theme.assets.menuCharacters || {})].filter(value => typeof value === "string");
    runtimeImages.forEach(url => {
      assert.match(url, /^\//, `${theme.id} runtime artwork must be local: ${url}`);
      assert.equal(fs.existsSync(path.join(root, url.slice(1))), true, url);
    });
  });
});

test("production routes and response headers support stable public links", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.rewrites, [
    { source: "/gift/:id", destination: "/gift?project=:id" },
    { source: "/studio/:id", destination: "/studio?project=:id" }
  ]);
  const globalHeaders = config.headers.find(rule => rule.source === "/(.*)")?.headers || [];
  const byName = Object.fromEntries(globalHeaders.map(header => [header.key, header.value]));
  assert.equal(byName["X-Frame-Options"], undefined);
  assert.match(byName["Content-Security-Policy"], /frame-ancestors 'self' https:\/\/for-you-always\.my\.id/);
  assert.match(byName["Permissions-Policy"], /camera=\(\)/);
  assert.doesNotMatch(read("gift/index.html"), /\sonload=/i);
});

test("Atlas failure states preserve saved stories without external map links", () => {
  const app = read("app.js"); const atlas = read("rooms/atlas.js"); const css = read("rooms/atlas.css");
  assert.doesNotMatch(app + atlas, /google\.com\/maps\/search/i);
  assert.match(app, /atlas-static-fallback/);
  assert.match(atlas, /atlas-fallback-list/);
  assert.match(css, /\.atlas-static-fallback/);
  assert.match(css, /\.atlas-fallback-place/);
});

test("gift music reports delivery failures without breaking the player", () => {
  const app = read("app.js"); const css = read("styles.css"); const i18n = read("shared/i18n.js");
  assert.match(app, /class="music-error" role="status" hidden/);
  assert.match(app, /storyAudio\.addEventListener\("error", showAudioError\)/);
  assert.match(app, /storyAudio\.removeEventListener\("error", showAudioError\)/);
  assert.match(css, /\.music-error/);
  assert.match(i18n, /"gift\.audioError"/);
});

test("Studio QR cards use each theme's registered character artwork", () => {
  const studio = read("studio/app.js"); const Themes = require("../shared/themes.js");
  const qrRenderer = studio.slice(studio.indexOf("function loadQrImage"), studio.indexOf("function renderQrCard"));
  assert.match(studio, /function loadQrArtwork/);
  assert.match(studio, /theme\.assets\?\.qr/);
  assert.match(studio, /function drawQrSticker/);
  assert.match(studio, /function drawQrHeartSeal/);
  assert.match(studio, /image\.crossOrigin = "anonymous"/);
  assert.doesNotMatch(qrRenderer, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  Object.values(Themes.THEMES).forEach(theme => {
    assert.ok(String(theme.assets.qr?.hero || "").trim(), `${theme.id} needs a QR hero`);
    assert.equal(theme.assets.qr?.stickers?.length, 2, `${theme.id} needs two QR stickers`);
  });
});

test("production allowlist excludes source masters and secrets", () => {
  const build = read("build.mjs"); const ignore = read(".vercelignore"); const wrangler = read("worker/wrangler.toml");
  assert.doesNotMatch(build, /design-source|tools/); assert.match(ignore, /worker\//);
  assert.match(wrangler, /binding\s*=\s*["']GIFT_KV["']/);
  assert.match(wrangler, /id\s*=\s*["'](?:REPLACE_WITH_STORYBOOK_KV_NAMESPACE_ID|[a-f0-9]{32})["']/i);
  assert.doesNotMatch(wrangler, /ADMIN_SECRET\s*=|SIGNING_SECRET\s*=|GENERATOR_SECRET\s*=/);
});


test("Studio room previews are lazy while the final review remains always visible", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js"); const gift = read("app.js");
  assert.match(html, /id="studio-preview-modal"/);
  assert.match(html, /id="gift-preview"/);
  assert.doesNotMatch(html, /id="open-full-preview"/);
  assert.match(studio, /function openPreview/);
  assert.match(studio, /EXAMPLE_PROJECT_ID = "gift-2cf4f3ec9cf1eb9b"/);
  assert.match(studio, /data-example-step/);
  assert.match(studio, /exampleGiftSrc/);
  assert.match(gift, /params\.get\("example"\) === "1"/);
  assert.match(studio, /function detectedPreviewViewport/);
  assert.doesNotMatch(html, /preview-viewport-switch/);
  assert.match(studio, /function closePreview/);
  assert.match(studio, /data-preview-step/);
  assert.match(studio, /target: "room", roomType: "atlas"/);
  assert.match(studio, /previewFrameLoaded/);
  assert.match(studio, /fullPreviewLoaded/);
  assert.match(studio, /frame.remove\(\)/);
  assert.match(gift, /function previewTarget/);
  assert.match(gift, /event.data.context/);
  assert.match(gift, /storybook-preview-target/);
  assert.match(studio, /storybook-preview-target/);
  assert.match(gift, /roomResize/);
  assert.match(gift, /params\.get\("demoTheme"\)/);
  assert.match(gift, /Object\.hasOwn\(Themes\.THEMES, demoTheme\)/);
});

test("Studio confirms before a preset overwrites existing personal writing", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js");
  assert.match(html, /id="preset-confirm-dialog"/);
  assert.match(html, /id="confirm-preset"/);
  assert.match(studio, /function requestPreset/);
  assert.match(studio, /function confirmPreset/);
  assert.match(studio, /presetConfirmReasons/);
  assert.doesNotMatch(studio, /confirm\(I18n\.t\("studio\.presetWarning"\)\)/);
});

test("Studio asks for a second confirmation before destructive removals", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js"); const i18n = read("shared/i18n.js");
  assert.match(html, /id="delete-confirm-dialog"/);
  assert.match(html, /id="confirm-delete"/);
  assert.match(studio, /function requestDelete/);
  assert.match(studio, /function confirmDelete/);
  assert.match(studio, /studio\.deleteGalleryTitle/);
  assert.match(studio, /studio\.deleteOpeningPhotoTitle/);
  assert.match(studio, /studio\.deleteAtlasLocationTitle/);
  assert.match(studio, /studio\.deleteAtlasPhotoTitle/);
  assert.match(studio, /studio\.deleteTrackTitle/);
  assert.match(studio, /studio\.deleteTrackCoverTitle/);
  assert.match(studio, /studio\.deleteReasonTitle/);
  assert.match(i18n, /"studio\.deleteConfirmAction": "Ya, hapus"/);
  assert.match(i18n, /"studio\.deleteConfirmAction": "Yes, delete"/);
});

test("Studio keeps a selected supported theme when an older Worker normalizes it away", () => {
  const studio = read("studio/app.js");
  assert.match(studio, /savedProject\.themeId !== snapshot\.themeId/);
  assert.match(studio, /draft = \{ \.\.\.draft, themeId: snapshot\.themeId \}/);
  assert.match(studio, /sendPreview\(\{ immediate: true \}\)/);
  assert.match(studio, /Worker rejected the selected theme/);
});

test("Arrange cards keep their fields and lightweight visual previews together", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js"); const css = read("studio/styles.css");
  assert.match(html, /class="module-mini-preview"/);
  assert.match(html, /class="module-preview-paper"/);
  assert.match(studio, /const syncModulePreview/);
  assert.match(studio, /module-preview-title/);
  assert.match(css, /\.chapter-planner \.module-row>\.module-card-main/);
  assert.match(css, /minmax\(280px,1fr\)/);
});

test("Soundtrack artwork uses the same safe crop and stable-ID upload path", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js");
  assert.match(html, /class="track-cover-file"/);
  assert.match(html, /class="remove-track-cover"/);
  assert.match(studio, /function uploadTrackCover/);
  assert.match(studio, /aspectRatio: 1/);
  assert.match(studio, /draft\.music\.tracks\.find\(entry => entry\.id === trackId\)/);
  assert.match(studio, /draft\.music\.tracks\.find\(entry => entry\.id === card\.dataset\.id\)/);
  const css = read("studio/styles.css");
  assert.match(html, /class="track-card-head"/);
  assert.match(html, /class="track-card-content"/);
  assert.match(css, /\.soundtrack-step \.track-editor\{display:block/);
  assert.match(css, /grid-template-areas:"cover fields" "cover actions"/);
});

test("Soundtrack exposes an optional per-track note that stays safe in the gift renderer", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js"); const gift = read("app.js"); const css = read("styles.css");
  assert.match(html, /class="track-quote"/);
  assert.match(html, /maxlength="180"/);
  assert.match(studio, /function catalogQuote/);
  assert.match(studio, /track\.quote = event\.target\.value/);
  assert.match(studio, /quote: catalogQuote\(track\)/);
  assert.match(studio, /quote: ""/);
  assert.match(gift, /function renderSongNote/);
  assert.match(gift, /song-note__text.*textContent = quote/);
  assert.match(css, /white-space: pre-wrap/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test("Studio guide dialog is present, wired correctly, and has no emojis", () => {
  const html = read("studio/index.html"); const studio = read("studio/app.js"); const css = read("studio/styles.css");
  assert.match(html, /id="studio-guide-dialog"/);
  assert.match(html, /id="open-studio-guide"/);
  assert.match(html, /id="start-studio-guide"/);
  assert.match(studio, /function openStudioGuide/);
  assert.match(studio, /function closeStudioGuide/);
  assert.match(studio, /storybook:guide:/);
  assert.match(css, /\.studio-guide-dialog/);
  assert.match(css, /\.studio-guide-grid/);
  assert.doesNotMatch(html, /[\u{1F300}-\u{1F9FF}]/u);
});

test("Studio defaults to English language and locale", () => {
  const html = read("studio/index.html"); const i18n = read("shared/i18n.js"); const project = read("shared/project.js"); const workerProject = read("worker/src/project.js");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<option value="en">English<\/option>/);
  assert.match(i18n, /let locale = "en";/);
  assert.match(project, /function emptyProject\(projectId = "new-storybook", language = "en"\)/);
  assert.match(workerProject, /const locale = "en"/);
});

test("Studio maintains light neutral workspace background and Themes.applyTheme is isolated from document body background", () => {
  const css = read("studio/styles.css");
  const themes = read("shared/themes.js");
  const studio = read("studio/app.js");
  assert.match(css, /background-color:#eee8e2!important/);
  assert.match(studio, /root\.style\.backgroundColor = ""/);
  assert.doesNotMatch(themes, /target\.style\.backgroundColor = theme\.palette\.surface/);
  assert.doesNotMatch(themes, /document\.body\.style\.backgroundColor/);
});

test("Atlas opens its cinematic tour on each fresh gift load and skips in-page revisits", () => {
  const app = read("app.js");
  const atlas = read("rooms/atlas.js");
  assert.match(app, /function isFirstAtlasVisit/);
  assert.match(app, /cinematic:\s*firstVisit/);
  assert.match(app, /atlasVisited\s*=\s*false/);
  assert.doesNotMatch(app, /storybook:atlas-seen|sessionStorage\.getItem\(storageKey\)/);
  assert.match(atlas, /const cinematic\s*=/);
  assert.match(atlas, /cinematic && !reducedMotion && !cinematicCancelled/);
});

test("Atlas location popups are a theme-neutral comic dossier with protected personal notes", () => {
  const atlas = read("rooms/atlas.js"); const css = read("rooms/atlas.css"); const html = read("studio/index.html");
  const spiderTheme = read("assets/themes/spiderman/theme.css"); const batmanTheme = read("assets/themes/batman/theme.css");
  assert.match(atlas, /atlas-popup-kicker/); assert.match(atlas, /const order = String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(atlas, /location\?\.title \|\| location\?\.label/); assert.match(atlas, /compact: true/);
  assert.match(atlas, /Next · buka ceritanya/); assert.match(atlas, /revealActiveStory/);
  assert.match(atlas, /if \(!compact && location\.note\)/); assert.match(atlas, /openLocationPopup\(index, \{ compact: false \}\)/);
  assert.doesNotMatch(atlas, /TITIK KENANGAN|MEMORY POINT/);
  assert.match(atlas, /atlas-popup-visual is-placeholder/); assert.match(atlas, /disableScrollPropagation/);
  assert.match(atlas, /function openLocationPopup/); assert.match(atlas, /getBoundingClientRect/);
  assert.doesNotMatch(atlas, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  assert.match(css, /aspect-ratio:4 \/ 3/); assert.match(css, /font-family:var\(--font-hand,cursive\)/); assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /atlas-pin-ring/); assert.match(css, /atlas-pin-tail/);
  assert.doesNotMatch(atlas, /atlas-popup-maps-link/);
  assert.match(spiderTheme, /--atlas-popup-decal/); assert.match(batmanTheme, /--atlas-popup-decal/);
  assert.doesNotMatch(html, /class="atlas-title"/); assert.match(html, /class="atlas-label"/); assert.match(css, /atlas-popup-card\.is-cinematic/); assert.match(css, /atlas-popup-reveal-arrow/);
});






test("Studio soundtrack uses an inline Snoopy-style picker with preview, upload, and play order", () => {
  const html = read("studio/index.html"); const app = read("studio/app.js"); const css = read("studio/styles.css");
  assert.doesNotMatch(html, /id="music-library-dialog"/);
  assert.match(html, /data-music-source="catalog"/);
  assert.match(html, /data-music-source="upload"/);
  assert.match(html, /data-source-panel="catalog"/);
  assert.match(html, /data-source-panel="upload"/);
  assert.match(html, /id="music-picker-toggle"[^>]+aria-expanded="true"/);
  assert.match(html, /id="music-picker-content"/);
  assert.match(html, /id="music-catalog-preview"/);
  assert.match(html, /id="music-upload"/);
  assert.match(html, /id="music-upload-status"/);
  assert.equal((html.match(/id="music-upload"/g) || []).length, 1);
  assert.match(html, /data-track-move="up"/);
  assert.match(html, /data-track-move="down"/);
  assert.ok(app.includes("function toggleMusicCatalogPreview"));
  assert.ok(app.includes("function selectMusicSource"));
  assert.ok(app.includes("function setMusicPickerExpanded"));
  assert.ok(app.includes("function initializeMusicPicker"));
  assert.ok(app.includes("$$" + "('[data-music-source]').forEach"));
  assert.ok(app.includes("function addCatalogTrack"));
  assert.ok(app.includes("audio.pause(); clearMusicCatalogPreviewState(); syncMusicPreviewButtons();"));
  assert.ok(app.includes('addEventListener("ended", () => { clearMusicCatalogPreviewState();'));
  assert.ok(app.includes("draft.music.tracks.length >= Project.MAX_MUSIC_TRACKS"));
  assert.doesNotMatch(app, /musicLibrarySelection|confirmMusicLibrarySelection|openMusicLibrary/);
  assert.ok(app.includes("swap(draft.music.tracks"));
  assert.ok(css.includes(".music-picker-toggle"));
  assert.ok(css.includes(".music-picker-content[hidden]"));
  assert.ok(css.includes(".music-source-tabs"));
  assert.ok(css.includes(".music-inline-grid"));
  assert.ok(!css.includes(".music-library-dialog"));
  const soundtrack = html.slice(html.indexOf('class="wizard-step soundtrack-step"'), html.indexOf('data-step="7"'));
  assert.doesNotMatch(soundtrack, /♫|🎵|🎶/u);
});
