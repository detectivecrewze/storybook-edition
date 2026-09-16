(function (root) {
  "use strict";
  const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  function getApiBase() { const value = root.STORYBOOK_RUNTIME?.apiBaseUrl?.trim() || document.querySelector('meta[name="gift-api-base"]')?.content?.trim() || ""; return value.replace(/\/$/, ""); }
  async function jsonRequest(path, options = {}) {
    const { timeoutMs = 30000, ...requestOptions } = options;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${getApiBase()}${path}`, { ...requestOptions, signal: controller.signal, headers: { Accept: "application/json", ...(requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(requestOptions.headers || {}) } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(payload.error || `HTTP ${response.status}`); error.status = response.status; error.payload = payload; throw error; }
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Permintaan terlalu lama. Periksa koneksi lalu coba lagi.");
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function mockEnabled(projectId) { const params = new URLSearchParams(location.search); return DEV_HOSTS.has(location.hostname) && (projectId === "sample-demo" || params.get("mock") === "1"); }
  const tokenHeaders = token => token ? { Authorization: `Bearer ${token}` } : {};
  class StorybookApi {
    constructor(projectId, token = "") { this.projectId = projectId; this.token = token; this.mock = mockEnabled(projectId) && root.StorybookMockApi; }
    getPublicGift() { return this.mock ? this.mock.getPublicGift(this.projectId) : jsonRequest(`/api/gift/${encodeURIComponent(this.projectId)}`); }
    getHealth() { return this.mock ? Promise.resolve({ ok: true, schemaVersion: root.StorybookProject?.SCHEMA_VERSION || 1, themeIds: Object.keys(root.StorybookThemes?.THEMES || {}) }) : jsonRequest("/api/health"); }
    getStudio() { return this.mock ? this.mock.getStudio(this.projectId, this.token) : jsonRequest(`/api/studio/${encodeURIComponent(this.projectId)}`, { headers: tokenHeaders(this.token) }); }
    saveStudio(project, status = "draft") { return this.mock ? this.mock.saveStudio(this.projectId, this.token, project, status) : jsonRequest(`/api/studio/${encodeURIComponent(this.projectId)}`, { method: "PUT", headers: tokenHeaders(this.token), body: JSON.stringify({ project, status }) }); }
    upload(file, kind) { if (this.mock) return this.mock.upload(this.projectId, this.token, file, kind); const body = new FormData(); body.append("projectId", this.projectId); body.append("kind", kind); body.append("file", file); return jsonRequest("/api/upload", { method: "POST", headers: tokenHeaders(this.token), body, timeoutMs: 60000 }); }
  }
  root.StorybookApi = StorybookApi;
})(window);
