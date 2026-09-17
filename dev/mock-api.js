(function (root) {
  "use strict";
  const fixtureUrl = "/fixtures/sample.json";
  const projectKey = id => `storybook:project:${id}`;
  const draftKey = id => `storybook:draft:${id}`;
  const wait = (value, delay = 100) => new Promise(resolve => setTimeout(() => resolve(value), delay));
  async function fixture() { const response = await fetch(fixtureUrl, { cache: "no-store" }); if (!response.ok) throw Object.assign(new Error("Fixture development tidak ditemukan."), { status: 404 }); return response.json(); }
  function clearEphemeralMedia(value) {
    const project = structuredClone(value);
    let changed = false;
    const clear = url => {
      if (typeof url === "string" && (url.startsWith("blob:") || url.startsWith("data:"))) { changed = true; return ""; }
      return url;
    };
    project.opening ||= {}; project.opening.panelImages = Array.isArray(project.opening.panelImages) ? project.opening.panelImages.map(clear) : ["", "", "", ""];
    project.gallery ||= {}; project.gallery.items = Array.isArray(project.gallery.items) ? project.gallery.items.map(item => ({ ...item, mediaUrl: clear(item.mediaUrl) })) : [];
    project.atlas ||= {}; project.atlas.locations = Array.isArray(project.atlas.locations) ? project.atlas.locations.map(item => ({ ...item, photoUrl: clear(item.photoUrl) })) : [];
    project.music ||= {}; project.music.tracks = Array.isArray(project.music.tracks) ? project.music.tracks.map(item => ({ ...item, audioUrl: clear(item.audioUrl), coverUrl: clear(item.coverUrl) })) : [];
    return { project, changed };
  }
  function readStored(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { localStorage.removeItem(key); return null; } }
  function cleanStoredProject(key) { const stored = readStored(key); if (!stored) return null; const result = clearEphemeralMedia(stored); if (result.changed) localStorage.setItem(key, JSON.stringify(result.project)); return result.project; }
  async function project(id) { return cleanStoredProject(projectKey(id)) || fixture(); }
  function token(value) { if (!value) throw Object.assign(new Error("Magic link Studio tidak valid."), { status: 401 }); }
  function temporaryUrl(file) { return URL.createObjectURL(file); }
  root.StorybookMockApi = {
    async getPublicGift(id) { const value = await project(id); if (value.status !== "published") throw Object.assign(new Error("Gift belum dipublish."), { status: 404 }); return wait({ project: root.StorybookProject.normalizeProject(value, id), mock: true }); },
    async getStudio(id, editToken) { token(editToken); const published = await project(id); const draft = cleanStoredProject(draftKey(id)); return wait({ project: root.StorybookProject.normalizeProject(draft || published, id), hasUnpublishedChanges: Boolean(draft), giftUrl: `${location.origin}/gift/${id}`, mock: true }); },
    async saveStudio(id, editToken, input, status) { token(editToken); const published = await project(id); const value = root.StorybookProject.normalizeProject({ ...input, status: status === "published" ? "published" : published.status === "published" ? "published" : "draft" }, id, published); const now = new Date().toISOString(); value.createdAt ||= now; value.updatedAt = now; if (status === "published") { value.publishedAt ||= now; localStorage.setItem(projectKey(id), JSON.stringify(value)); localStorage.removeItem(draftKey(id)); } else localStorage.setItem(draftKey(id), JSON.stringify(value)); return wait({ project: value, giftUrl: `${location.origin}/gift/${id}`, mock: true }); },
    async upload(id, editToken, file, kind) { token(editToken); return wait({ url: temporaryUrl(file), kind, mock: true }); }
  };
})(window);
