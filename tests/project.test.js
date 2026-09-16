"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Themes = require("../shared/themes.js");
const Project = require("../shared/project.js");
const I18n = require("../shared/i18n.js");
const secondTheme = require("./fixtures/second-theme.json");

test("project schema exposes all general presets and neutral module types", () => {
  assert.equal(Project.PRODUCT_ID, "storybook");
  assert.deepEqual(Project.MODULE_TYPES, ["reasons", "gallery", "music", "letter"]);
  assert.deepEqual(Object.keys(Project.OCCASION_PRESETS), ["romantic", "anniversary", "birthday", "appreciation", "friendship", "graduation", "just-because"]);
  assert.equal(Project.emptyProject("gift-demo").settings.language, "id");
});

test("normalization caps collection sizes, keeps order, and rejects unsupported themes", () => {
  const input = Project.emptyProject("gift-normalize");
  input.themeId = "unknown";
  input.reasons.items = Array.from({ length: 20 }, (_, index) => `Reason ${index}`);
  input.gallery.items = Array.from({ length: 20 }, (_, index) => ({ id: `m-${index}`, mediaUrl: `/assets/${index}.webp` }));
  input.music.tracks = Array.from({ length: 6 }, (_, index) => ({ id: `t-${index}`, title: `Track ${index}`, audioUrl: `/assets/${index}.mp3` }));
  input.modules.reverse().forEach((module, index) => module.order = index);
  const normalized = Project.normalizeProject(input, input.projectId);
  assert.equal(normalized.themeId, "spiderman");
  assert.equal(normalized.reasons.items.length, 10);
  assert.equal(normalized.gallery.items.length, 15);
  assert.equal(normalized.music.tracks.length, 3);
  assert.equal(normalized.modules[0].type, "letter");
});

test("publish validation requires content only for active modules and at least two modules", () => {
  const draft = Project.emptyProject("gift-validation");
  draft.identity = { recipient: "Nadia", sender: "Aldo", eventDate: "" };
  draft.modules.forEach(module => module.enabled = ["reasons", "letter"].includes(module.type));
  draft.letter = { greeting: "Dear Nadia,", paragraphs: ["A story for you."], signoff: "Aldo" };
  assert.equal(Project.validateProject(draft, { forPublish: true }).valid, true);
  draft.modules.find(module => module.type === "letter").enabled = false;
  assert.ok(Project.validateProject(draft, { forPublish: true }).errors.modules);
});

test("language changes translate built-in defaults without changing personal copy", () => {
  const draft = Project.emptyProject("gift-language");
  draft.identity.recipient = "Nadia";
  draft.reasons.items[0] = "Tulisan personal milik customer";
  Project.changeLanguage(draft, "en");
  assert.equal(draft.settings.language, "en");
  assert.equal(draft.modules[0].title, "Why You Matter");
  assert.equal(draft.reasons.items[0], "Tulisan personal milik customer");
  assert.equal(draft.opening.eyebrow, Project.OCCASION_PRESETS.romantic.copy.en.eyebrow);
});

test("both locale dictionaries have identical keys", () => {
  assert.deepEqual(Object.keys(I18n.messages.id).sort(), Object.keys(I18n.messages.en).sort());
});

test("production and fixture themes satisfy the same renderer contract", () => {
  assert.equal(Themes.validateThemeManifest(Themes.THEMES.spiderman).valid, true);
  assert.equal(Themes.validateThemeManifest(secondTheme).valid, true);
  const broken = structuredClone(secondTheme); delete broken.assets.gallery;
  assert.equal(Themes.validateThemeManifest(broken).valid, false);
});
