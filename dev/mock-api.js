(function (root) {
  "use strict";
  const fixtureUrl = "/fixtures/sample.json";
  const projectKey = id => `storybook:project:${id}`;
  const draftKey = id => `storybook:draft:${id}`;
  const wait = (value, delay = 100) => new Promise(resolve => setTimeout(() => resolve(value), delay));
  async function fixture() { const response = await fetch(fixtureUrl, { cache: "no-store" }); if (!response.ok) throw Object.assign(new Error("Fixture development tidak ditemukan."), { status: 404 }); return response.json(); }
  async function project(id) { const stored = localStorage.getItem(projectKey(id)); return stored ? JSON.parse(stored) : fixture(); }
  function token(value) { if (!value) throw Object.assign(new Error("Magic link Studio tidak valid."), { status: 401 }); }
  function dataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("File tidak dapat dibaca.")); reader.readAsDataURL(file); }); }
  root.StorybookMockApi = {
    async getPublicGift(id) { const value = await project(id); if (value.status !== "published") throw Object.assign(new Error("Gift belum dipublish."), { status: 404 }); return wait({ project: root.StorybookProject.normalizeProject(value, id), mock: true }); },
    async getStudio(id, editToken) { token(editToken); const published = await project(id); const draft = localStorage.getItem(draftKey(id)); return wait({ project: root.StorybookProject.normalizeProject(draft ? JSON.parse(draft) : published, id), hasUnpublishedChanges: Boolean(draft), giftUrl: `${location.origin}/gift/${id}`, mock: true }); },
    async saveStudio(id, editToken, input, status) { token(editToken); const published = await project(id); const value = root.StorybookProject.normalizeProject({ ...input, status: status === "published" ? "published" : published.status === "published" ? "published" : "draft" }, id, published); const now = new Date().toISOString(); value.createdAt ||= now; value.updatedAt = now; if (status === "published") { value.publishedAt ||= now; localStorage.setItem(projectKey(id), JSON.stringify(value)); localStorage.removeItem(draftKey(id)); } else localStorage.setItem(draftKey(id), JSON.stringify(value)); return wait({ project: value, giftUrl: `${location.origin}/gift/${id}`, mock: true }); },
    async upload(id, editToken, file, kind) { token(editToken); return wait({ url: await dataUrl(file), kind, mock: true }); }
  };
})(window);
