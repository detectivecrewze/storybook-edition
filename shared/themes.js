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
      description: Object.freeze({ id: "Aksi komik klasik merah-biru.", en: "Classic red-and-blue comic style." }),
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
      studio: Object.freeze({ topbar: "#23171b", sidebar: "#2d1b21" }),
      fonts: Object.freeze({ display: "Bangers, Impact, sans-serif", body: "DM Sans, Arial, sans-serif", handwritten: "Caveat, cursive" }),
      textures: Object.freeze({ surface: "/assets/themes/spiderman/red-web-paper.webp", paper: "/assets/themes/spiderman/paper-grain.webp" }),
      assets: Object.freeze({
        giftBox: "/assets/themes/spiderman/gift-box-v2.webp",
        openingEmblem: "/assets/themes/spiderman/spiderman-character.webp",
        greeting: "/assets/themes/spiderman/spiderman-character.webp",
        finale: "/assets/themes/spiderman/spiderman-character.webp",
        skyline: "/assets/themes/spiderman/city-silhouette.webp",
        reasons: "/assets/themes/spiderman/icon-reasons.webp",
        gallery: "/assets/themes/spiderman/icon-gallery.webp",
        atlas: "/assets/themes/spiderman/icon-atlas-v2.webp",
        music: "/assets/themes/spiderman/icon-music.webp",
        letter: "/assets/themes/spiderman/icon-letter.webp",
        menuCharacters: Object.freeze({
          left: "https://media.tenor.com/FbIEm5UJ28sAAAAi/spiderman-tom-holland.gif",
          right: "https://media.tenor.com/FbIEm5UJ28sAAAAi/spiderman-tom-holland.gif",
          mirrorRight: true
        }),
        decals: Object.freeze([
          "/assets/themes/spiderman/decal-web.webp",
          "/assets/themes/spiderman/decal-mask.webp",
          "/assets/themes/spiderman/decal-burst.webp",
          "/assets/themes/spiderman/decal-spider.webp"
        ])
      }),
      motion: Object.freeze({ room: "paper-slide", card: "card-flip", letter: "envelope-open", duration: 420 })
    }),
    batman: Object.freeze({
      id: "batman",
      label: "Batman",
      description: Object.freeze({ id: "Gotham noir & siluet malam.", en: "Gotham noir & night skyline." }),
      thumbnail: "/assets/themes/batman/thumbnail.webp",
      stylesheet: "/assets/themes/batman/theme.css",
      palette: Object.freeze({
        primary: "#d6a62e",
        primaryDark: "#7a5a12",
        secondary: "#273b55",
        accent: "#f0c54a",
        paper: "#f4eedf",
        surface: "#0b111b",
        ink: "#11151c",
        muted: "#686b72"
      }),
      studio: Object.freeze({ topbar: "#09111c", sidebar: "#0b1522" }),
      fonts: Object.freeze({ display: "Bangers, Impact, sans-serif", body: "DM Sans, Arial, sans-serif", handwritten: "Caveat, cursive" }),
      textures: Object.freeze({ surface: "/assets/themes/batman/gotham-night-paper.webp", paper: "/assets/themes/batman/paper-grain.webp" }),
      assets: Object.freeze({
        giftBox: "/assets/themes/batman/gift-box-v2.webp",
        openingEmblem: "/assets/themes/batman/noir-emblem.webp",
        greeting: "/assets/themes/batman/finale-friends.webp",
        finale: "/assets/themes/batman/finale-friends.webp",
        skyline: "/assets/themes/batman/city-silhouette.webp",
        reasons: "/assets/themes/batman/icon-reasons.webp",
        gallery: "/assets/themes/batman/icon-gallery.webp",
        atlas: "/assets/themes/batman/icon-atlas.webp",
        music: "/assets/themes/batman/icon-music.webp",
        letter: "/assets/themes/batman/icon-letter.webp",
        menuCharacters: Object.freeze({
          left: "/assets/themes/batman/menu-hero-left.webp",
          right: "/assets/themes/batman/menu-bat-right.webp",
          mirrorRight: false
        }),
        decals: Object.freeze([
          "/assets/themes/batman/noir-emblem.webp",
          "/assets/themes/batman/icon-gallery.webp",
          "/assets/themes/batman/icon-atlas.webp",
          "/assets/themes/batman/city-silhouette.webp"
        ])
      }),
      motion: Object.freeze({ room: "paper-slide", card: "card-flip", letter: "envelope-open", duration: 480 })
    })
  });

  const DEFAULT_THEME_ID = "spiderman";
  const REQUIRED_ASSETS = Object.freeze(["openingEmblem", "greeting", "finale", "skyline", "reasons", "gallery", "atlas", "music", "letter"]);
  const validateThemeManifest = manifest => {
    const errors = [];
    if (!manifest || typeof manifest !== "object") return { valid: false, errors: ["Theme manifest is required."] };
    for (const key of ["id", "label", "thumbnail", "stylesheet"]) if (!String(manifest[key] || "").trim()) errors.push(`Missing ${key}.`);
    if (!(typeof manifest.description === "string" ? manifest.description.trim() : String(manifest.description?.id || "").trim() && String(manifest.description?.en || "").trim())) errors.push("Missing description.");
    for (const key of ["primary", "primaryDark", "secondary", "accent", "paper", "surface", "ink", "muted"]) if (!String(manifest.palette?.[key] || "").trim()) errors.push(`Missing palette.${key}.`);
    for (const key of ["display", "body", "handwritten"]) if (!String(manifest.fonts?.[key] || "").trim()) errors.push(`Missing fonts.${key}.`);
    for (const key of ["surface", "paper"]) if (!String(manifest.textures?.[key] || "").trim()) errors.push(`Missing textures.${key}.`);
    for (const key of REQUIRED_ASSETS) if (!String(manifest.assets?.[key] || "").trim()) errors.push(`Missing assets.${key}.`);
    if (manifest.assets?.menuCharacters) {
      for (const side of ["left", "right"]) if (!String(manifest.assets.menuCharacters[side] || "").trim()) errors.push(`Missing assets.menuCharacters.${side}.`);
    }
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
    const surfaceTexture = `url('${theme.textures.surface}')`;
    const paperTexture = `url('${theme.textures.paper}')`;
    target.style.setProperty("--surface-texture", surfaceTexture);
    target.style.setProperty("--paper-texture", paperTexture);
    target.style.backgroundColor = theme.palette.surface;
    target.style.colorScheme = "dark";
    if (typeof document !== "undefined") {
      if (document.body) {
        document.body.style.backgroundColor = theme.palette.surface;
        document.body.style.setProperty("--surface-texture", surfaceTexture);
        document.body.style.setProperty("--paper-texture", paperTexture);
      }
      const metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (metaThemeColor) {
        metaThemeColor.content = theme.palette.surface;
      }
    }
    return theme;
  };

  return { THEMES, DEFAULT_THEME_ID, REQUIRED_ASSETS, validateThemeManifest, normalizeThemeId, getTheme, applyTheme };
});
