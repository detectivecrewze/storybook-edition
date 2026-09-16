(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StorybookThemes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const THEMES = Object.freeze({
    spiderman: Object.freeze({
      id: "spiderman",
      label: "Spider-Man",
      description: Object.freeze({ id: "Pahlawan komik merah-biru dengan tekstur web dan panel scrapbook.", en: "A red-and-blue comic hero with web textures and scrapbook panels." }),
      thumbnail: "/assets/themes/spiderman/thumbnail.webp",
      stylesheet: "/assets/themes/spiderman/theme.css",
      palette: Object.freeze({
        primary: "#c9182b",
        primaryDark: "#7b0d1b",
        secondary: "#1557a5",
        accent: "#f3c84b",
        paper: "#fffaf0",
        surface: "#a80f21",
        ink: "#17191f",
        muted: "#6d6670"
      }),
      fonts: Object.freeze({ display: "Bangers, Impact, sans-serif", body: "DM Sans, Arial, sans-serif", handwritten: "Caveat, cursive" }),
      textures: Object.freeze({ surface: "/assets/themes/spiderman/red-web-paper.webp", paper: "/assets/themes/spiderman/paper-grain.webp" }),
      assets: Object.freeze({
        openingEmblem: "/assets/themes/spiderman/opening-emblem.webp",
        greeting: "/assets/themes/spiderman/greeting-hero.webp",
        finale: "/assets/themes/spiderman/finale-hero.webp",
        skyline: "/assets/themes/spiderman/city-silhouette.webp",
        reasons: "/assets/themes/spiderman/icon-reasons.webp",
        gallery: "/assets/themes/spiderman/icon-gallery.webp",
        music: "/assets/themes/spiderman/icon-music.webp",
        letter: "/assets/themes/spiderman/icon-letter.webp",
        decals: Object.freeze([
          "/assets/themes/spiderman/decal-web.webp",
          "/assets/themes/spiderman/decal-mask.webp",
          "/assets/themes/spiderman/decal-burst.webp",
          "/assets/themes/spiderman/decal-spider.webp"
        ])
      }),
      motion: Object.freeze({ room: "paper-slide", card: "card-flip", letter: "envelope-open", duration: 420 })
    })
  });

  const DEFAULT_THEME_ID = "spiderman";
  const REQUIRED_ASSETS = Object.freeze(["openingEmblem", "greeting", "finale", "skyline", "reasons", "gallery", "music", "letter"]);
  const validateThemeManifest = manifest => {
    const errors = [];
    if (!manifest || typeof manifest !== "object") return { valid: false, errors: ["Theme manifest is required."] };
    for (const key of ["id", "label", "thumbnail", "stylesheet"]) if (!String(manifest[key] || "").trim()) errors.push(`Missing ${key}.`);
    if (!(typeof manifest.description === "string" ? manifest.description.trim() : String(manifest.description?.id || "").trim() && String(manifest.description?.en || "").trim())) errors.push("Missing description.");
    for (const key of ["primary", "primaryDark", "secondary", "accent", "paper", "surface", "ink", "muted"]) if (!String(manifest.palette?.[key] || "").trim()) errors.push(`Missing palette.${key}.`);
    for (const key of ["display", "body", "handwritten"]) if (!String(manifest.fonts?.[key] || "").trim()) errors.push(`Missing fonts.${key}.`);
    for (const key of ["surface", "paper"]) if (!String(manifest.textures?.[key] || "").trim()) errors.push(`Missing textures.${key}.`);
    for (const key of REQUIRED_ASSETS) if (!String(manifest.assets?.[key] || "").trim()) errors.push(`Missing assets.${key}.`);
    if (!Array.isArray(manifest.assets?.decals)) errors.push("Missing assets.decals.");
    if (!Number.isFinite(Number(manifest.motion?.duration))) errors.push("Missing motion.duration.");
    return { valid: errors.length === 0, errors };
  };
  const normalizeThemeId = value => Object.hasOwn(THEMES, String(value || "").toLowerCase()) ? String(value).toLowerCase() : DEFAULT_THEME_ID;
  const getTheme = value => THEMES[normalizeThemeId(value)];
  const applyTheme = (themeId, target = document.documentElement) => {
    const theme = getTheme(themeId);
    target.dataset.theme = theme.id;
    Object.entries(theme.palette).forEach(([key, value]) => target.style.setProperty(`--theme-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value));
    target.style.setProperty("--font-display", theme.fonts.display);
    target.style.setProperty("--font-body", theme.fonts.body);
    target.style.setProperty("--font-hand", theme.fonts.handwritten);
    return theme;
  };

  return { THEMES, DEFAULT_THEME_ID, REQUIRED_ASSETS, validateThemeManifest, normalizeThemeId, getTheme, applyTheme };
});
