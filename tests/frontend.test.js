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

test("gift renderer is theme-neutral and customer media is constructed inside rooms", () => {
  const app = read("app.js");
  assert.match(app, /Themes\.applyTheme\(project\.themeId\)/);
  assert.doesNotMatch(app, /themeId\s*===|case\s+["']spiderman|if\s*\([^)]*spiderman/i);
  assert.match(app, /function renderGallery/); assert.match(app, /function renderMusic/); assert.match(app, /function renderLetter/);
  assert.match(app, /function renderAtlas/);
  assert.match(app, /get\("preview"\) === "1"/);
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
  const Themes = require("../shared/themes.js"); const theme = Themes.THEMES.spiderman;
  const urls = [...new Set([theme.thumbnail, theme.textures.surface, theme.textures.paper, ...Object.values(theme.assets).flatMap(value => Array.isArray(value) ? value : [value])].filter(value => typeof value === "string"))];
  let total = 0;
  for (const url of urls) { const file = path.join(root, url.replace(/^\//, "")); assert.equal(fs.existsSync(file), true, url); const size = fs.statSync(file).size; total += size; assert.ok(size <= 250 * 1024, `${url} is ${(size / 1024).toFixed(1)} KB`); }
  assert.ok(total <= 600 * 1024, `initial theme manifest totals ${(total / 1024).toFixed(1)} KB`);
});

test("production allowlist excludes source masters and secrets", () => {
  const build = read("build.mjs"); const ignore = read(".vercelignore"); const wrangler = read("worker/wrangler.toml");
  assert.doesNotMatch(build, /design-source|tools/); assert.match(ignore, /worker\//);
  assert.match(wrangler, /binding\s*=\s*["']GIFT_KV["']/);
  assert.match(wrangler, /id\s*=\s*["'](?:REPLACE_WITH_STORYBOOK_KV_NAMESPACE_ID|[a-f0-9]{32})["']/i);
  assert.doesNotMatch(wrangler, /ADMIN_SECRET\s*=|SIGNING_SECRET\s*=|GENERATOR_SECRET\s*=/);
});
