(function (root) {
  "use strict";
  const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  function getApiBase() { const value = root.STORYBOOK_RUNTIME?.apiBaseUrl?.trim() || document.querySelector('meta[name="gift-api-base"]')?.content?.trim() || ""; return value.replace(/\/$/, ""); }
  async function jsonRequest(path, options = {}) {
    const { timeoutMs = 30000, ...requestOptions } = options;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${getApiBase()}${path}`;
    const method = requestOptions.method || "GET";
    try {
      const response = await fetch(url, { ...requestOptions, signal: controller.signal, headers: { Accept: "application/json", ...(requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(requestOptions.headers || {}) } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(payload.error || `HTTP ${response.status}`); error.status = response.status; error.payload = payload; console.error("[Storybook API] Request failed", { method, path, status: response.status, message: error.message, details: payload.details }); throw error; }
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Permintaan terlalu lama. Periksa koneksi lalu coba lagi.");
      if (!error?.status) console.error("[Storybook API] Network request failed", { method, path, apiBase: getApiBase(), message: error?.message || "Unknown error" }, error);
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function mockEnabled(projectId) { const params = new URLSearchParams(location.search); return DEV_HOSTS.has(location.hostname) && (projectId === "sample-demo" || params.get("mock") === "1"); }
  const tokenHeaders = token => token ? { Authorization: `Bearer ${token}` } : {};
  class StorybookApi {
    constructor(projectId, token = "") { this.projectId = projectId; this.token = token; this.mock = mockEnabled(projectId) && root.StorybookMockApi; if (this.mock) console.warn("[Storybook Studio] Sample demo mode is active. Uploads are preview-only and are not sent to Worker/R2.", { projectId }); }
    getPublicGift() { return this.mock ? this.mock.getPublicGift(this.projectId) : jsonRequest(`/api/gift/${encodeURIComponent(this.projectId)}`); }
    getHealth() { return this.mock ? Promise.resolve({ ok: true, schemaVersion: root.StorybookProject?.SCHEMA_VERSION || 1, themeIds: Object.keys(root.StorybookThemes?.THEMES || {}) }) : jsonRequest("/api/health"); }
    getStudio() { return this.mock ? this.mock.getStudio(this.projectId, this.token) : jsonRequest(`/api/studio/${encodeURIComponent(this.projectId)}`, { headers: tokenHeaders(this.token) }); }
    saveStudio(project, status = "draft") { return this.mock ? this.mock.saveStudio(this.projectId, this.token, project, status) : jsonRequest(`/api/studio/${encodeURIComponent(this.projectId)}`, { method: "PUT", headers: tokenHeaders(this.token), body: JSON.stringify({ project, status }) }); }
    upload(file, kind) {
      console.info("[Storybook Studio] Upload started", { projectId: this.projectId, kind, size: file?.size || 0, type: file?.type || "", mock: Boolean(this.mock) });
      if (this.mock) return this.mock.upload(this.projectId, this.token, file, kind).then(result => { console.info("[Storybook Studio] Upload completed", { projectId: this.projectId, kind, mock: true }); return result; });
      const body = new FormData(); body.append("projectId", this.projectId); body.append("kind", kind); body.append("file", file);
      return jsonRequest("/api/upload", { method: "POST", headers: tokenHeaders(this.token), body, timeoutMs: 60000 }).then(result => { console.info("[Storybook Studio] Upload completed", { projectId: this.projectId, kind, mock: false, mediaUrl: result?.url || "" }); return result; }).catch(error => { console.error("[Storybook Studio] Upload failed", { projectId: this.projectId, kind, status: error?.status, message: error?.message }, error); throw error; });
    }
  }
  root.StorybookApi = StorybookApi;
})(window);
