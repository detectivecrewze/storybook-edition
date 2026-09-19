"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Themes = require("../shared/themes.js");
const Project = require("../shared/project.js");
const I18n = require("../shared/i18n.js");
const Maps = require("../shared/maps.js");
const secondTheme = require("./fixtures/second-theme.json");

test("project schema exposes all general presets and neutral module types", () => {
  assert.equal(Project.PRODUCT_ID, "storybook");
  assert.equal(Project.SCHEMA_VERSION, 2);
  assert.deepEqual(Project.MODULE_TYPES, ["reasons", "gallery", "atlas", "music", "letter"]);
  assert.deepEqual(Object.keys(Project.OCCASION_PRESETS), ["romantic", "anniversary", "birthday", "appreciation", "friendship", "graduation", "just-because"]);
  assert.equal(Project.emptyProject("gift-demo").settings.language, "en");
  assert.equal(Project.emptyProject("gift-demo").modules.find(module => module.type === "atlas").enabled, false);
  assert.equal(Project.emptyProject("gift-demo").modules.find(module => module.type === "atlas").title, "Atlas of us");
  assert.deepEqual(Project.emptyProject("gift-demo").opening.panelImages, ["", "", "", ""]);
});

test("normalization caps collection sizes, keeps order, and rejects unsupported themes", () => {
  const input = Project.emptyProject("gift-normalize");
  input.themeId = "unknown";
  input.reasons.items = Array.from({ length: 20 }, (_, index) => `Reason ${index}`);
  input.gallery.items = Array.from({ length: 20 }, (_, index) => ({ id: `m-${index}`, mediaUrl: `/assets/${index}.webp` }));
  input.music.tracks = Array.from({ length: 6 }, (_, index) => ({ id: `t-${index}`, title: `Track ${index}`, audioUrl: `/assets/${index}.mp3` }));
  input.atlas.locations = Array.from({ length: 14 }, (_, index) => ({ id: `l-${index}`, label: `Place ${index}`, latitude: -6 + index / 100, longitude: 106 + index / 100 }));
  input.modules.reverse().forEach((module, index) => module.order = index);
  const normalized = Project.normalizeProject(input, input.projectId);
  assert.equal(normalized.themeId, "spiderman");
  assert.equal(normalized.reasons.items.length, 10);
  assert.equal(normalized.gallery.items.length, 15);
  assert.equal(normalized.music.tracks.length, 3);
  assert.equal(normalized.atlas.locations.length, 10);
  assert.equal(normalized.modules[0].type, "letter");
});

test("schema v1 projects gain an empty disabled Atlas without changing the original four rooms", () => {
  const legacy = Project.emptyProject("gift-legacy");
  legacy.schemaVersion = 1; delete legacy.atlas; delete legacy.opening.panelImages;
  legacy.modules = legacy.modules.filter(module => module.type !== "atlas");
  const normalized = Project.normalizeProject(legacy, legacy.projectId);
  assert.equal(normalized.schemaVersion, 2);
  assert.deepEqual(normalized.opening.panelImages, ["", "", "", ""]);
  assert.equal(normalized.modules.filter(module => module.enabled).length, 4);
  assert.equal(normalized.modules.find(module => module.type === "atlas").enabled, false);
  assert.deepEqual(normalized.modules.filter(module => module.enabled).map(module => module.type), ["reasons", "gallery", "music", "letter"]);
  assert.equal(normalized.modules.at(-1).type, "atlas");
  assert.equal(normalized.modules.at(-1).title, "Atlas of us");
});

test("Atlas validation requires a named in-range location only when enabled", () => {
  const draft = Project.emptyProject("gift-atlas"); draft.identity = { recipient: "Nadia", sender: "Aldo", eventDate: "" };
  draft.modules.find(module => module.type === "atlas").enabled = true;
  assert.ok(Project.validateProject(draft, { forPublish: true }).errors.atlas);
  draft.atlas.locations = [{ id: "location-1", label: "First date", latitude: -6.2, longitude: 106.8, mapsUrl: "", photoUrl: "", note: "" }];
  assert.equal(Project.validateProject(draft, { forPublish: true }).errors.atlas, undefined);
});

test("Google Maps parser accepts full coordinate formats and rejects short links", () => {
  const pairs = [
    "https://www.google.com/maps/place/Test/@-6.2,106.8,15z",
    "https://www.google.com/maps?q=-6.2,106.8",
    "https://www.google.com/maps?ll=-6.2,106.8",
    "https://www.google.com/maps/dir/?destination=-6.2,106.8",
    "https://www.google.com/maps/@0,0/data=!3d-6.2!4d106.8",
    "https://www.google.com/maps?center=-6.2,106.8"
  ];
  pairs.forEach(url => assert.deepEqual(Maps.extractGoogleMapsCoordinates(url), { latitude: -6.2, longitude: 106.8 }));
  assert.deepEqual(
    Maps.extractCoordinates("https://www.google.com/maps/search/-6.243697337236942,+106.79772145306548/@-6.22806,106.71875,14z"),
    { latitude: -6.243697337236942, longitude: 106.79772145306548, source: "maps" }
  );
  assert.equal(Maps.extractGoogleMapsCoordinates("https://maps.app.goo.gl/abc"), null);
  assert.equal(Maps.validCoordinates(91, 106.8), false);
});

test("location input accepts a pasted coordinate pair and formats it safely", () => {
  assert.deepEqual(Maps.extractCoordinates("-6.2000, 106.8000"), { latitude: -6.2, longitude: 106.8, source: "coordinates" });
  assert.deepEqual(Maps.extractCoordinates("-6.2 106.8"), { latitude: -6.2, longitude: 106.8, source: "coordinates" });
  assert.equal(Maps.extractCoordinates("-91, 106.8"), null);
  assert.equal(Maps.formatCoordinates(-6.2, 106.8), "-6.20000, 106.80000");
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
  const draft = Project.emptyProject("gift-language", "id");
  draft.identity.recipient = "Nadia";
  draft.reasons.items[0] = "Tulisan personal milik customer";
  Project.changeLanguage(draft, "en");
  assert.equal(draft.settings.language, "en");
  assert.equal(draft.modules[0].title, "Why You Matter");
  assert.equal(draft.reasons.items[0], "Tulisan personal milik customer");
  assert.equal(draft.opening.eyebrow, Project.OCCASION_PRESETS.romantic.copy.en.eyebrow);
  Project.changeLanguage(draft, "id");
  assert.equal(draft.settings.language, "id");
  assert.equal(draft.modules[0].title, "Kenapa Kamu Berarti");
  assert.equal(draft.reasons.items[0], "Tulisan personal milik customer");
  assert.equal(draft.opening.eyebrow, Project.OCCASION_PRESETS.romantic.copy.id.eyebrow);
});

test("both locale dictionaries have identical keys", () => {
  assert.deepEqual(Object.keys(I18n.messages.id).sort(), Object.keys(I18n.messages.en).sort());
});

test("production and fixture themes satisfy the same renderer contract", () => {
  assert.deepEqual(Object.keys(Themes.THEMES), ["spiderman", "batman"]);
  Object.values(Themes.THEMES).forEach(theme => assert.equal(Themes.validateThemeManifest(theme).valid, true, theme.id));
  assert.equal(Themes.THEMES.spiderman.assets.openingPanels.length, 4);
  assert.equal(Themes.validateThemeManifest(secondTheme).valid, true);
  const broken = structuredClone(secondTheme); delete broken.assets.gallery;
  assert.equal(Themes.validateThemeManifest(broken).valid, false);
});

test("Batman is selectable while Spider-Man remains the legacy default", () => {
  const batman = Project.emptyProject("gift-batman");
  batman.themeId = "batman";
  assert.equal(Project.normalizeProject(batman, batman.projectId).themeId, "batman");
  assert.equal(Project.emptyProject("gift-default").themeId, "spiderman");
});
