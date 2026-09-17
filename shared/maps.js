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
      // Tier 1: Search & place paths (/maps/search/lat,lng or /maps/place/lat,lng)
      /(?:\/maps\/(?:search|place)\/)(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)(?:[/?#&]|$)/i,
      // Tier 2: Query parameters (q, query, destination, ll)
      /[?&](?:q|query|destination|ll)=(?:loc:)?(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)(?:[&/#]|$)/i,
      // Tier 2b: Center query parameter
      /[?&]center=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)(?:[&/#]|$)/i,
      // Tier 3: Protobuf parameters (!3d<lat>!4d<lng>)
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
      // Tier 4: Camera viewport fallback (@<lat>,<lng>)
      /@(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/i
    ];
    for (const pattern of patterns) {
      const match = decoded.match(pattern);
      if (match) {
        const pair = coordinatePair(match[1], match[2]);
        if (pair) return pair;
      }
    }
    return null;
  }

  function extractCoordinates(value) {
    const source = String(value || "").trim();
    if (!source || isShortMapsUrl(source)) return null;
    const fromMaps = extractGoogleMapsCoordinates(source);
    if (fromMaps) return { ...fromMaps, source: "maps" };
    const direct = source.match(/^\s*\(?\[?\s*(-?\d+(?:\.\d+)?)\s*(?:,|;|\s)\s*(-?\d+(?:\.\d+)?)\s*\)?\]?\s*$/);
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
