const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function validCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function pair(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return validCoordinates(lat, lng) ? { latitude: lat, longitude: lng } : null;
}

function placeLabelFromUrl(value) {
  try {
    const url = value instanceof URL ? value : new URL(String(value || ""));
    const query = String(url.searchParams.get("q") || url.searchParams.get("query") || "").trim();
    if (!query || pair(...query.split(/[,+\s]+/, 2))) return "";
    return query.split(",")[0].trim().slice(0, 100);
  } catch { return ""; }
}

export function extractGoogleMapsCoordinates(value) {
  let source = String(value || "").trim();
  if (!source) return null;
  try { source = decodeURIComponent(source); } catch {}
  const patterns = [
    /\/maps\/(?:search|place)\/(-?\d+(?:\.\d+)?)[,+%20\s]+(-?\d+(?:\.\d+)?)/i,
    /[?&](?:q|query|destination|ll)=(-?\d+(?:\.\d+)?)[,%20+\s]+(-?\d+(?:\.\d+)?)/i,
    /[?&]center=(-?\d+(?:\.\d+)?)[,%20+\s]+(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      const result = pair(match[1], match[2]);
      if (result) return result;
    }
  }
  return null;
}

export function extractGoogleMapsPreviewCoordinates(value) {
  const source = String(value || "");
  const exactPlace = source.match(/\[null,null,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/);
  if (exactPlace) return pair(exactPlace[1], exactPlace[2]);
  const initialPlace = source.match(/\[\[(?:\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/);
  return initialPlace ? pair(initialPlace[2], initialPlace[1]) : null;
}

function previewUrlFromHtml(value, baseUrl) {
  const match = String(value || "").match(/href="(\/maps\/preview\/place\?[^"<>]+)"/i);
  if (!match) return null;
  const decoded = match[1].replace(/&amp;/g, "&").replace(/&#38;/g, "&");
  try {
    const url = new URL(decoded, baseUrl);
    return isAllowedGoogleMapsRedirect(url) ? url : null;
  } catch { return null; }
}

async function limitedText(response, maxBytes = 512 * 1024) {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > maxBytes) throw new Error("GOOGLE_MAPS_RESPONSE_TOO_LARGE");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("GOOGLE_MAPS_RESPONSE_TOO_LARGE");
  return text;
}

export function isShortGoogleMapsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && (url.hostname.toLowerCase() === "maps.app.goo.gl" || url.hostname.toLowerCase() === "goo.gl");
  } catch { return false; }
}

export function isAllowedGoogleMapsRedirect(value) {
  try {
    const url = value instanceof URL ? value : new URL(String(value || ""));
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host === "goo.gl") return true;
    return /^(?:[a-z0-9-]+\.)*google\.(?:com|[a-z]{2,3})(?:\.[a-z]{2})?$/.test(host);
  } catch { return false; }
}

export async function resolveGoogleMapsShortUrl(value, fetcher = fetch) {
  if (!isShortGoogleMapsUrl(value)) throw new Error("SHORT_GOOGLE_MAPS_URL_REQUIRED");
  let current = new URL(String(value).trim());
  let label = "";
  for (let hop = 0; hop < 6; hop += 1) {
    if (!isAllowedGoogleMapsRedirect(current)) throw new Error("UNSAFE_GOOGLE_MAPS_REDIRECT");
    label ||= placeLabelFromUrl(current);
    const coordinates = extractGoogleMapsCoordinates(current.toString());
    if (coordinates) return { ...coordinates, ...(label ? { label } : {}) };
    const response = await fetcher(current.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml" }
    });
    if (response.status === 200) {
      const page = await limitedText(response);
      if (current.pathname.startsWith("/maps/preview/place")) {
        const embeddedCoordinates = extractGoogleMapsPreviewCoordinates(page);
        if (embeddedCoordinates) return { ...embeddedCoordinates, ...(label ? { label } : {}) };
      }
      const previewUrl = previewUrlFromHtml(page, current);
      if (!previewUrl) throw new Error("GOOGLE_MAPS_PREVIEW_MISSING");
      const previewResponse = await fetcher(previewUrl.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { Accept: "application/json,text/plain,*/*" }
      });
      if (!previewResponse.ok) throw new Error("GOOGLE_MAPS_PREVIEW_UNAVAILABLE");
      const previewCoordinates = extractGoogleMapsPreviewCoordinates(await limitedText(previewResponse));
      if (previewCoordinates) return { ...previewCoordinates, ...(label ? { label } : {}) };
      throw new Error("GOOGLE_MAPS_COORDINATES_MISSING");
    }
    if (!REDIRECT_STATUSES.has(response.status)) throw new Error("GOOGLE_MAPS_REDIRECT_UNAVAILABLE");
    const location = response.headers.get("Location");
    if (!location) throw new Error("GOOGLE_MAPS_REDIRECT_MISSING");
    current = new URL(location, current);
  }
  throw new Error("GOOGLE_MAPS_REDIRECT_LIMIT");
}

export function canonicalGoogleMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps?q=${Number(latitude)},${Number(longitude)}`;
}
