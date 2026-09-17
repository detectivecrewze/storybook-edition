(function (root, factory) {
  const api = factory(root.StorybookThemes);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StorybookProject = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ThemeApi) {
  "use strict";

  const SCHEMA_VERSION = 2;
  const PRODUCT_ID = "storybook";
  const MAX_REASONS = 10;
  const MIN_REASONS = 4;
  const MAX_GALLERY_ITEMS = 15;
  const MAX_MUSIC_TRACKS = 3;
  const MAX_ATLAS_LOCATIONS = 10;
  const MODULE_TYPES = Object.freeze(["reasons", "gallery", "atlas", "music", "letter"]);
  const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

  const UI_DEFAULTS = Object.freeze({
    id: Object.freeze({
      moduleTitles: Object.freeze({ reasons: "Kenapa Kamu Berarti", gallery: "Arsip Kenangan", atlas: "Atlas of us", music: "Soundtrack Kita", letter: "Sebuah Surat" }),
      moduleSubtitles: Object.freeze({ reasons: "Hal-hal kecil yang membuatmu istimewa.", gallery: "Momen yang ingin selalu disimpan.", atlas: "Tempat-tempat yang menjadi bagian dari cerita kita.", music: "Lagu-lagu yang membawa kita kembali.", letter: "Kata-kata yang ingin kusampaikan." }),
      finaleTitle: "Satu hal terakhir untukmu",
      finaleMessage: "Terima kasih sudah menjadi bagian dari cerita yang begitu berarti.",
      finaleSignoff: "Dengan penuh kasih,"
    }),
    en: Object.freeze({
      moduleTitles: Object.freeze({ reasons: "Why You Matter", gallery: "Memory Archive", atlas: "Atlas of us", music: "Our Soundtrack", letter: "A Letter" }),
      moduleSubtitles: Object.freeze({ reasons: "The little things that make you special.", gallery: "Moments worth keeping forever.", atlas: "Places that became part of our story.", music: "Songs that bring us back.", letter: "Words I have been meaning to say." }),
      finaleTitle: "One last thing for you",
      finaleMessage: "Thank you for being part of a story that means so much.",
      finaleSignoff: "With all my love,"
    })
  });
  const VALIDATION_MESSAGES = Object.freeze({
    id: Object.freeze({ projectId: "Project ID tidak valid.", recipient: "Nama penerima wajib diisi.", sender: "Nama pengirim wajib diisi.", modules: "Aktifkan setidaknya dua bagian gift.", reasons: `Isi ${MIN_REASONS}–${MAX_REASONS} alasan.`, gallery: "Tambahkan setidaknya satu foto atau video.", atlas: "Tambahkan minimal satu lokasi dengan nama dan koordinat yang valid.", music: "Setiap lagu aktif membutuhkan file dan judul.", letter: "Lengkapi greeting, isi, dan penutup surat." }),
    en: Object.freeze({ projectId: "The project ID is invalid.", recipient: "Enter the recipient name.", sender: "Enter the sender name.", modules: "Enable at least two gift sections.", reasons: `Write ${MIN_REASONS}–${MAX_REASONS} reasons.`, gallery: "Add at least one photo or video.", atlas: "Add at least one location with a name and valid coordinates.", music: "Every active song needs an audio file and title.", letter: "Complete the letter greeting, body, and signoff." })
  });

  const OCCASION_PRESETS = Object.freeze({
    romantic: Object.freeze({ id: "romantic", label: Object.freeze({ id: "Romantis", en: "Romantic" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Sebuah cerita kecil untukmu", title: "Untuk seseorang yang membuat segalanya terasa lebih indah", message: "Ada beberapa hal yang ingin kusimpan dan kusampaikan khusus untukmu." }), en: Object.freeze({ eyebrow: "A little story for you", title: "For the one who makes everything feel brighter", message: "There are a few memories and words I saved especially for you." }) }) }),
    anniversary: Object.freeze({ id: "anniversary", label: Object.freeze({ id: "Anniversary", en: "Anniversary" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Merayakan cerita kita", title: "Satu perjalanan, begitu banyak kenangan", message: "Mari melihat kembali hal-hal kecil yang membuat perjalanan ini berarti." }), en: Object.freeze({ eyebrow: "Celebrating our story", title: "One journey, so many memories", message: "Let us revisit the little things that made this journey meaningful." }) }) }),
    birthday: Object.freeze({ id: "birthday", label: Object.freeze({ id: "Ulang Tahun", en: "Birthday" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Hari spesialmu", title: "Selamat ulang tahun, bintang utama hari ini", message: "Ada beberapa kejutan kecil yang dibuat khusus untuk merayakanmu." }), en: Object.freeze({ eyebrow: "Your special day", title: "Happy birthday to today’s brightest star", message: "A few little surprises are waiting here to celebrate you." }) }) }),
    appreciation: Object.freeze({ id: "appreciation", label: Object.freeze({ id: "Apresiasi", en: "Appreciation" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Karena kamu pantas mendengarnya", title: "Terima kasih sudah menjadi dirimu", message: "Halaman kecil ini menyimpan alasan kenapa kehadiranmu begitu berarti." }), en: Object.freeze({ eyebrow: "Because you deserve to hear it", title: "Thank you for being exactly who you are", message: "These pages hold a few reasons why your presence means so much." }) }) }),
    friendship: Object.freeze({ id: "friendship", label: Object.freeze({ id: "Persahabatan", en: "Friendship" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Untuk partner segala cerita", title: "Hidup jauh lebih seru karena ada kamu", message: "Untuk semua tawa, kekacauan, dan kenangan yang kita kumpulkan." }), en: Object.freeze({ eyebrow: "For my favorite partner in everything", title: "Life is much more fun with you in it", message: "For every laugh, little chaos, and memory we collected together." }) }) }),
    graduation: Object.freeze({ id: "graduation", label: Object.freeze({ id: "Kelulusan", en: "Graduation" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Satu bab selesai", title: "Lihat sejauh apa kamu sudah melangkah", message: "Ini adalah perayaan untuk kerja keras, keberanian, dan perjalanan barumu." }), en: Object.freeze({ eyebrow: "One chapter complete", title: "Look how far you have come", message: "A celebration of your hard work, courage, and the journey ahead." }) }) }),
    "just-because": Object.freeze({ id: "just-because", label: Object.freeze({ id: "Tanpa Alasan Khusus", en: "Just Because" }), copy: Object.freeze({ id: Object.freeze({ eyebrow: "Tidak perlu menunggu hari spesial", title: "Ini dibuat hanya karena aku memikirkanmu", message: "Kadang hal yang paling tulus datang tanpa alasan selain rasa sayang." }), en: Object.freeze({ eyebrow: "No special date required", title: "I made this simply because you crossed my mind", message: "Sometimes the sweetest things need no reason beyond caring." }) }) })
  });

  function text(value, fallback = "", maximum = 10000) { return typeof value === "string" ? value.trim().slice(0, maximum) : fallback; }
  function normalizeLanguage(value) { return value === "en" ? "en" : "id"; }
  function normalizeOccasion(value) { return Object.hasOwn(OCCASION_PRESETS, value) ? value : "romantic"; }
  function makeId(prefix = "item") { const random = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; return `${prefix}-${random}`; }
  function themeId(value) { return ThemeApi?.normalizeThemeId ? ThemeApi.normalizeThemeId(value) : text(value, "spiderman", 40).toLowerCase(); }
  function moduleDefaults(language) { const locale = UI_DEFAULTS[normalizeLanguage(language)]; return MODULE_TYPES.map((type, order) => ({ type, enabled: type !== "atlas", order, title: locale.moduleTitles[type], subtitle: locale.moduleSubtitles[type] })); }
  function presetCopy(preset, language) { return OCCASION_PRESETS[normalizeOccasion(preset)].copy[normalizeLanguage(language)]; }
  function defaultReasons(language) { return language === "en" ? ["You make ordinary days feel special.", "You listen with your whole heart.", "Your smile makes everything lighter.", "You always know how to make me laugh."] : ["Kamu membuat hari biasa terasa istimewa.", "Kamu selalu mendengarkan dengan sepenuh hati.", "Senyummu membuat segalanya terasa lebih ringan.", "Kamu selalu tahu cara membuatku tertawa."]; }

  function emptyProject(projectId = "new-storybook", language = "id") {
    const locale = normalizeLanguage(language);
    const opening = presetCopy("romantic", locale);
    return {
      schemaVersion: SCHEMA_VERSION, productId: PRODUCT_ID, projectId, status: "draft", themeId: ThemeApi?.DEFAULT_THEME_ID || "spiderman", occasionPreset: "romantic",
      identity: { recipient: "", sender: "", eventDate: "" }, opening: { ...opening, panelImages: ["", "", "", ""] }, modules: moduleDefaults(locale), reasons: { items: defaultReasons(locale) },
      gallery: { items: [{ id: makeId("media"), mediaType: "image", mediaUrl: "", title: "", caption: "" }] }, atlas: { locations: [] }, music: { tracks: [] }, letter: { greeting: "", paragraphs: [], signoff: "" },
      finale: { title: UI_DEFAULTS[locale].finaleTitle, message: UI_DEFAULTS[locale].finaleMessage, signoff: UI_DEFAULTS[locale].finaleSignoff }, settings: { language: locale },
      createdAt: "", updatedAt: "", publishedAt: null
    };
  }

  function normalizeModules(source, language) {
    const defaults = moduleDefaults(language);
    const incoming = Array.isArray(source) ? source : [];
    const appendedOrder = incoming.reduce((highest, item) => Number.isFinite(Number(item?.order)) ? Math.max(highest, Number(item.order)) : highest, -1) + 1;
    return MODULE_TYPES.map((type, fallbackOrder) => {
      const found = incoming.find(candidate => candidate?.type === type);
      const item = found || {};
      const fallback = defaults[fallbackOrder];
      const order = Number.isFinite(Number(item.order)) ? Number(item.order) : (!found && type === "atlas" ? appendedOrder : fallbackOrder);
      const title = text(item.title, fallback.title, 80);
      const legacyAtlasTitle = type === "atlas" && ["Atlas Kita", "Atlas of Us", "Atlas of us", "The Map Of Perfect Tiny Thing"].includes(title);
      return { type, enabled: found ? item.enabled !== false : fallback.enabled, order, title: legacyAtlasTitle ? fallback.title : title, subtitle: text(item.subtitle, fallback.subtitle, 160) };
    }).sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }));
  }

  function normalizeProject(input, projectId, existing = null) {
    const source = input && typeof input === "object" ? input : {};
    const previous = existing && typeof existing === "object" ? existing : null;
    const language = normalizeLanguage(source.settings?.language ?? previous?.settings?.language);
    const fallback = emptyProject(projectId || text(source.projectId, "new-storybook", 64), language);
    const reasons = Array.isArray(source.reasons?.items) ? source.reasons.items : fallback.reasons.items;
    const gallerySource = Array.isArray(source.gallery?.items) ? source.gallery.items : [];
    const atlasSource = Array.isArray(source.atlas?.locations) ? source.atlas.locations : [];
    const tracksSource = Array.isArray(source.music?.tracks) ? source.music.tracks : [];
    const panelImages = Array.isArray(source.opening?.panelImages) ? source.opening.panelImages : [];
    const paragraphs = Array.isArray(source.letter?.paragraphs) ? source.letter.paragraphs : text(source.letter?.body).split(/\n\s*\n/);
    return {
      schemaVersion: SCHEMA_VERSION, productId: PRODUCT_ID, projectId: text(projectId || source.projectId, fallback.projectId, 64).toLowerCase(),
      status: source.status === "published" ? "published" : source.status === "archived" ? "archived" : "draft", themeId: themeId(source.themeId), occasionPreset: normalizeOccasion(source.occasionPreset),
      identity: { recipient: text(source.identity?.recipient, "", 80), sender: text(source.identity?.sender, "", 80), eventDate: text(source.identity?.eventDate, "", 40) },
      opening: { eyebrow: text(source.opening?.eyebrow, fallback.opening.eyebrow, 100), title: text(source.opening?.title, fallback.opening.title, 180), message: text(source.opening?.message, fallback.opening.message, 400), panelImages: Array.from({ length: 4 }, (_, index) => text(panelImages[index], "", 2048)) },
      modules: normalizeModules(source.modules, language), reasons: { items: reasons.slice(0, MAX_REASONS).map(value => text(value, "", 220)).filter(Boolean) },
      gallery: { items: gallerySource.slice(0, MAX_GALLERY_ITEMS).map((item, index) => { const mediaType = item?.mediaType === "video" ? "video" : "image"; const mediaUrl = text(item?.mediaUrl || item?.imageUrl || item?.videoUrl, "", 2048); return { id: text(item?.id, `media-${index + 1}`, 100), mediaType, mediaUrl, title: text(item?.title, "", 100), caption: text(item?.caption || item?.story, "", 350) }; }) },
      atlas: { locations: atlasSource.slice(0, MAX_ATLAS_LOCATIONS).map((item, index) => { const latitude = item?.latitude === "" || item?.latitude == null ? null : Number(item.latitude); const longitude = item?.longitude === "" || item?.longitude == null ? null : Number(item.longitude); return { id: text(item?.id, `location-${index + 1}`, 100), label: text(item?.label, "", 100), latitude: Number.isFinite(latitude) ? latitude : null, longitude: Number.isFinite(longitude) ? longitude : null, mapsUrl: text(item?.mapsUrl, "", 2048), photoUrl: text(item?.photoUrl, "", 2048), note: text(item?.note, "", 500) }; }) },
      music: { tracks: tracksSource.slice(0, MAX_MUSIC_TRACKS).map((track, index) => ({ id: text(track?.id, `track-${index + 1}`, 100), sourceType: track?.sourceType === "upload" ? "upload" : "catalog", catalogId: text(track?.catalogId, "", 100), audioUrl: text(track?.audioUrl, "", 2048), coverUrl: text(track?.coverUrl, "", 2048), title: text(track?.title, "", 100), artist: text(track?.artist, "", 100) })).filter(track => track.audioUrl || track.title) },
      letter: { greeting: text(source.letter?.greeting, "", 120), paragraphs: paragraphs.slice(0, 50).map(value => text(value, "", 4000)).filter(Boolean), signoff: text(source.letter?.signoff, "", 220) },
      finale: { title: text(source.finale?.title, fallback.finale.title, 140), message: text(source.finale?.message, fallback.finale.message, 500), signoff: text(source.finale?.signoff, fallback.finale.signoff, 160) },
      settings: { language }, createdAt: text(previous?.createdAt || source.createdAt, "", 40), updatedAt: text(source.updatedAt || previous?.updatedAt, "", 40), publishedAt: source.publishedAt || previous?.publishedAt || null
    };
  }

  function validateProject(input, options = {}) {
    const project = normalizeProject(input, input?.projectId);
    const errors = {};
    const messages = VALIDATION_MESSAGES[project.settings.language];
    const enabled = project.modules.filter(module => module.enabled);
    if (!PROJECT_ID_PATTERN.test(project.projectId)) errors.projectId = messages.projectId;
    if (project.identity.recipient.length < 2) errors.recipient = messages.recipient;
    if (project.identity.sender.length < 2) errors.sender = messages.sender;
    if (!options.forPublish) return { valid: true, errors: {}, project };
    if (enabled.length < 2) errors.modules = messages.modules;
    if (enabled.some(module => module.type === "reasons") && (project.reasons.items.length < MIN_REASONS || project.reasons.items.length > MAX_REASONS)) errors.reasons = messages.reasons;
    if (enabled.some(module => module.type === "gallery") && !project.gallery.items.some(item => item.mediaUrl)) errors.gallery = messages.gallery;
    if (enabled.some(module => module.type === "atlas") && !project.atlas.locations.some(item => item.label && Number.isFinite(item.latitude) && item.latitude >= -90 && item.latitude <= 90 && Number.isFinite(item.longitude) && item.longitude >= -180 && item.longitude <= 180)) errors.atlas = messages.atlas;
    if (enabled.some(module => module.type === "music") && (!project.music.tracks.length || project.music.tracks.some(track => !track.audioUrl || !track.title))) errors.music = messages.music;
    if (enabled.some(module => module.type === "letter") && (!project.letter.greeting || !project.letter.paragraphs.length || !project.letter.signoff)) errors.letter = messages.letter;
    return { valid: Object.keys(errors).length === 0, errors, project };
  }

  function applyOccasionPreset(project, presetId, language = project?.settings?.language) { const normalized = normalizeProject(project, project?.projectId); normalized.occasionPreset = normalizeOccasion(presetId); normalized.opening = { ...presetCopy(normalized.occasionPreset, normalizeLanguage(language)), panelImages: [...normalized.opening.panelImages] }; return normalized; }
  function changeLanguage(project, language) {
    const previousLanguage = normalizeLanguage(project?.settings?.language); const nextLanguage = normalizeLanguage(language); const currentDefaults = UI_DEFAULTS[previousLanguage]; const nextDefaults = UI_DEFAULTS[nextLanguage]; const currentPreset = presetCopy(project.occasionPreset, previousLanguage); const nextPreset = presetCopy(project.occasionPreset, nextLanguage);
    for (const key of ["eyebrow", "title", "message"]) if (project.opening?.[key] === currentPreset[key]) project.opening[key] = nextPreset[key];
    project.modules?.forEach(module => { if (module.title === currentDefaults.moduleTitles[module.type]) module.title = nextDefaults.moduleTitles[module.type]; if (module.subtitle === currentDefaults.moduleSubtitles[module.type]) module.subtitle = nextDefaults.moduleSubtitles[module.type]; });
    for (const key of ["title", "message", "signoff"]) { const prop = `finale${key[0].toUpperCase()}${key.slice(1)}`; if (project.finale?.[key] === currentDefaults[prop]) project.finale[key] = nextDefaults[prop]; }
    const sampleReasons = defaultReasons(previousLanguage); if (project.reasons?.items?.length === sampleReasons.length && project.reasons.items.every((value, index) => value === sampleReasons[index])) project.reasons.items = defaultReasons(nextLanguage);
    project.settings = { ...project.settings, language: nextLanguage }; return project;
  }
  function projectIdFromPath(pathname, search = "") { try { const query = new URLSearchParams(String(search || "")).get("project"); if (query) return text(query).toLowerCase(); } catch {} const match = String(pathname || "").match(/^\/(?:gift|studio)\/([^/?#]+)/i); return match ? decodeURIComponent(match[1]).toLowerCase() : ""; }

  return { SCHEMA_VERSION, PRODUCT_ID, MAX_REASONS, MIN_REASONS, MAX_GALLERY_ITEMS, MAX_MUSIC_TRACKS, MAX_ATLAS_LOCATIONS, MODULE_TYPES, PROJECT_ID_PATTERN, UI_DEFAULTS, VALIDATION_MESSAGES, OCCASION_PRESETS, emptyProject, normalizeProject, validateProject, normalizeLanguage, normalizeOccasion, applyOccasionPreset, changeLanguage, moduleDefaults, projectIdFromPath, makeId };
});
