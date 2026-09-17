(function (root) {
  "use strict";

  function finite(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function validCoordinates(latitude, longitude) {
    const lat = finite(latitude);
    const lng = finite(longitude);
    return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function isShortMapsUrl(value) {
    try {
      const host = new URL(String(value || "").trim()).hostname.toLowerCase();
      return host === "maps.app.goo.gl" || host === "goo.gl";
    } catch {
      return false;
    }
  }

  function coordinatePair(first, second) {
    const latitude = finite(first);
    const longitude = finite(second);
    return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
  }

  function extractGoogleMapsCoordinates(value) {
    const source = String(value || "").trim();
    if (!source || isShortMapsUrl(source)) return null;
    const decoded = (() => { try { return decodeURIComponent(source); } catch { return source; } })();
    const patterns = [
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
      /[?&](?:q|ll|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i
    ];
    for (const pattern of patterns) {
      const match = decoded.match(pattern);
      if (match) return coordinatePair(match[1], match[2]);
    }
    return null;
  }

  function extractCoordinates(value) {
    const source = String(value || "").trim();
    if (!source || isShortMapsUrl(source)) return null;
    const fromMaps = extractGoogleMapsCoordinates(source);
    if (fromMaps) return { ...fromMaps, source: "maps" };
    const direct = source.match(/^(-?\d+(?:\.\d+)?)\s*(?:,|;|\s)\s*(-?\d+(?:\.\d+)?)$/);
    if (!direct) return null;
    const pair = coordinatePair(direct[1], direct[2]);
    return pair ? { ...pair, source: "coordinates" } : null;
  }

  function formatCoordinates(latitude, longitude, decimals = 5) {
    if (!validCoordinates(latitude, longitude)) return "";
    return `${Number(latitude).toFixed(decimals)}, ${Number(longitude).toFixed(decimals)}`;
  }

  function canonicalGoogleMapsUrl(latitude, longitude) {
    if (!validCoordinates(latitude, longitude)) return "";
    return `https://www.google.com/maps/search/?api=1&query=${Number(latitude)},${Number(longitude)}`;
  }

  const api = { finite, validCoordinates, isShortMapsUrl, extractGoogleMapsCoordinates, extractCoordinates, formatCoordinates, canonicalGoogleMapsUrl };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StorybookMaps = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
