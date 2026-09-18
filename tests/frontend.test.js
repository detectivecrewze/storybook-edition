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

test("menu character decorations are theme-driven and remain lazy until the menu renders", () => {
  const html = read("gift/index.html"); const app = read("app.js"); const themes = read("shared/themes.js");
  assert.match(html, /id="menu-character-left"/); assert.match(html, /id="menu-character-right"/);
  assert.match(html, /id="finale-companion"/); assert.match(app, /theme\.assets\.finaleCompanion/);
  assert.doesNotMatch(html, /spiderman-tom-holland\.gif/);
  assert.match(app, /function renderMenuCharacters/); assert.match(app, /theme\?\.assets\?\.menuCharacters/);
  assert.doesNotMatch(app, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  assert.match(themes, /menuCharacters/);
});

test("Atlas dependencies are local and remain lazy until the room is opened", () => {
  const html = read("gift/index.html"); const app = read("app.js"); const build = read("build.mjs");
  assert.doesNotMatch(html, /leaflet/i);
  assert.match(app, /\/assets\/vendor\/leaflet\/leaflet\.js/);
  assert.match(app, /\/rooms\/atlas\.js/);
  assert.match(build, /"rooms"/);
  assert.equal(fs.existsSync(path.join(root, "assets/vendor/leaflet/leaflet.js")), true);
  assert.equal(fs.existsSync(path.join(root, "rooms/atlas.js")), true);
});

test("manifest assets exist and remain inside the theme performance budget", () => {
  const Themes = require("../shared/themes.js");
  Object.values(Themes.THEMES).forEach(theme => {
    const urls = [...new Set([theme.thumbnail, theme.textures.surface, theme.textures.paper, ...Object.values(theme.assets).flatMap(value => Array.isArray(value) ? value : [value])].filter(value => typeof value === "string"))];
    let total = 0;
    for (const url of urls) { const file = path.join(root, url.replace(/^\//, "")); assert.equal(fs.existsSync(file), true, url); const size = fs.statSync(file).size; total += size; assert.ok(size <= 250 * 1024, `${url} is ${(size / 1024).toFixed(1)} KB`); }
    assert.ok(total <= 600 * 1024, `${theme.id} theme manifest totals ${(total / 1024).toFixed(1)} KB`);
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
  assert.match(gift, /roomResize/);
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



