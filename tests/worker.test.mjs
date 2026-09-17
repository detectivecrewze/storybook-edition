import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.File) globalThis.File = File;
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, "binary").toString("base64");
const { default: worker } = await import("../worker/src/index.js");

class MockKV { constructor() { this.values = new Map(); } async get(key, type) { if (!this.values.has(key)) return null; const value = this.values.get(key); return type === "json" ? JSON.parse(value) : value; } async put(key, value) { this.values.set(key, String(value)); } async delete(key) { this.values.delete(key); } async list({ prefix = "", limit = 1000, cursor } = {}) { const keys = [...this.values.keys()].filter(key => key.startsWith(prefix)).sort(); const start = cursor ? Number(cursor) : 0; const page = keys.slice(start, start + limit); const next = start + page.length; return { keys: page.map(name => ({ name })), list_complete: next >= keys.length, cursor: next >= keys.length ? undefined : String(next) }; } }
class MockR2 { constructor() { this.values = new Map(); } async put(key, value, options) { this.values.set(key, { data: value, options }); } async list({ prefix = "", limit = 1000, cursor } = {}) { const keys = [...this.values.keys()].filter(key => key.startsWith(prefix)).sort(); const start = cursor ? Number(cursor) : 0; const page = keys.slice(start, start + limit); const next = start + page.length; return { objects: page.map(key => ({ key })), truncated: next < keys.length, cursor: next < keys.length ? String(next) : undefined }; } async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) this.values.delete(key); } }
function env() { return { GIFT_KV: new MockKV(), MEDIA_BUCKET: new MockR2(), ALLOWED_ORIGINS: "https://storybook.test", ALLOWED_ORIGIN_SUFFIXES: ".vercel.app", PUBLIC_GIFT_BASE_URL: "https://storybook.test", PUBLIC_STUDIO_BASE_URL: "https://storybook.test", MEDIA_BASE_URL: "https://media.test", PROJECT_SIGNING_SECRET: "stable-project-signing-secret", ADMIN_SECRET: "admin-secret", INTERNAL_GENERATOR_SECRET: "generator-secret" }; }
async function call(environment, path, options = {}) { const headers = new Headers(options.headers || {}); headers.set("Origin", options.origin || "https://storybook.test"); if (options.token) headers.set("Authorization", `Bearer ${options.token}`); let body = options.body; if (body && !(body instanceof FormData)) { headers.set("Content-Type", "application/json"); body = JSON.stringify(body); } const response = await worker.fetch(new Request(`https://worker.test${path}`, { method: options.method || "GET", headers, body }), environment); return { response, payload: await response.json().catch(() => ({})) }; }
const tokenFrom = url => new URLSearchParams(new URL(url).hash.slice(1)).get("token");
function complete(project) { return { ...project, identity: { recipient: "Nadia", sender: "Aldo", eventDate: "" }, reasons: { items: ["One", "Two", "Three", "Four"] }, gallery: { items: [{ id: "media-1", mediaType: "image", mediaUrl: "https://media.test/storybook/photo.webp", title: "Moment", caption: "Caption" }] }, music: { tracks: [{ id: "track-1", sourceType: "catalog", audioUrl: "https://media.test/storybook/song.mp3", coverUrl: "", title: "Our Song", artist: "Artist" }] }, letter: { greeting: "Dear Nadia,", paragraphs: ["A story for you."], signoff: "Aldo" } }; }

test("internal generator is authenticated and idempotent", async () => {
  const environment = env();
  assert.equal((await call(environment, "/api/internal/projects", { method: "POST", token: "wrong", body: { source: "pakasir", idempotencyKey: "order-1" } })).response.status, 403);
  const first = await call(environment, "/api/internal/projects", { method: "POST", token: environment.INTERNAL_GENERATOR_SECRET, body: { source: "pakasir", idempotencyKey: "order-1" } });
  const second = await call(environment, "/api/internal/projects", { method: "POST", token: environment.INTERNAL_GENERATOR_SECRET, body: { source: "pakasir", idempotencyKey: "order-1" } });
  assert.equal(first.response.status, 201); assert.equal(second.response.status, 200); assert.equal(first.payload.projectId, second.payload.projectId); assert.equal(first.payload.studioUrl, second.payload.studioUrl); assert.match(first.payload.studioUrl, /\/studio\/gift-[a-f0-9]{16}#token=/);
  const studio = await call(environment, `/api/studio/${first.payload.projectId}`, { token: tokenFrom(first.payload.studioUrl) });
  assert.equal(studio.payload.project.schemaVersion, 2); assert.equal(studio.payload.project.modules.find(module => module.type === "atlas").enabled, false); assert.deepEqual(studio.payload.project.opening.panelImages, ["", "", "", ""]);
});

test("draft, publish, public gift, and private autosave stay separated", async () => {
  const environment = env(); const created = await call(environment, "/api/admin/projects", { method: "POST", token: environment.ADMIN_SECRET, body: { idempotencyKey: "flow-1" } }); const id = created.payload.projectId; const token = tokenFrom(created.payload.studioUrl);
  assert.equal((await call(environment, `/api/gift/${id}`)).response.status, 404);
  const studio = await call(environment, `/api/studio/${id}`, { token });
  assert.equal((await call(environment, `/api/studio/${id}`, { method: "PUT", token, body: { project: studio.payload.project, status: "published" } })).response.status, 422);
  const published = await call(environment, `/api/studio/${id}`, { method: "PUT", token, body: { project: complete(studio.payload.project), status: "published" } }); assert.equal(published.response.status, 200);
  const edited = structuredClone(published.payload.project); edited.opening.title = "Unpublished change";
  await call(environment, `/api/studio/${id}`, { method: "PUT", token, body: { project: edited, status: "draft" } });
  assert.notEqual((await call(environment, `/api/gift/${id}`)).payload.project.opening.title, "Unpublished change");
  assert.equal((await call(environment, `/api/studio/${id}`, { token })).payload.project.opening.title, "Unpublished change");
});

test("upload, archive, restore, admin search, and permanent delete work", async () => {
  const environment = env(); const created = await call(environment, "/api/admin/projects", { method: "POST", token: environment.ADMIN_SECRET, body: { idempotencyKey: "cleanup-1" } }); const id = created.payload.projectId; const token = tokenFrom(created.payload.studioUrl); const studio = await call(environment, `/api/studio/${id}`, { token });
  await call(environment, `/api/studio/${id}`, { method: "PUT", token, body: { project: complete(studio.payload.project), status: "published" } });
  const form = new FormData(); form.append("projectId", id); form.append("kind", "photo"); form.append("file", new File([new Uint8Array([1, 2, 3])], "memory.webp", { type: "image/webp" }));
  const upload = await call(environment, "/api/upload", { method: "POST", token, body: form }); assert.equal(upload.response.status, 201); assert.match(upload.payload.url, new RegExp(`/storybook/${id}/photos/`));
  const list = await call(environment, "/api/admin/projects?search=Nadia", { token: environment.ADMIN_SECRET }); assert.equal(list.payload.projects.length, 1); assert.equal(list.payload.projects[0].themeId, "spiderman");
  assert.equal((await call(environment, `/api/admin/projects/${id}`, { method: "PATCH", token: environment.ADMIN_SECRET, body: { action: "archive" } })).payload.project.status, "archived");
  assert.equal((await call(environment, `/api/gift/${id}`)).response.status, 404);
  assert.equal((await call(environment, `/api/admin/projects/${id}`, { method: "PATCH", token: environment.ADMIN_SECRET, body: { action: "restore" } })).payload.project.status, "published");
  const removed = await call(environment, `/api/admin/projects/${id}`, { method: "DELETE", token: environment.ADMIN_SECRET }); assert.equal(removed.payload.removedMedia, 1); assert.equal((await call(environment, `/api/gift/${id}`)).response.status, 404);
});

test("health exposes the Storybook contract and CORS rejects unknown origins", async () => {
  const environment = env(); const health = await call(environment, "/api/health"); assert.equal(health.payload.service, "storybook-gift-api"); assert.equal(health.payload.schemaVersion, 2); assert.deepEqual(health.payload.languages, ["id", "en"]); assert.deepEqual(health.payload.themeIds, ["spiderman"]); assert.equal((await call(environment, "/api/health", { origin: "https://evil.test" })).response.status, 403);
});
