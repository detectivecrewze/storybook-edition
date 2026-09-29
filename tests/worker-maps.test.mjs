import test from "node:test";
import assert from "node:assert/strict";
import { extractGoogleMapsCoordinates, extractGoogleMapsFtidCoordinates, extractGoogleMapsPreviewCoordinates, isAllowedGoogleMapsRedirect, isShortGoogleMapsUrl, resolveGoogleMapsShortUrl } from "../worker/src/maps.js";

test("worker map resolver accepts Google domains and rejects unrelated redirect hosts", () => {
  assert.equal(isShortGoogleMapsUrl("https://maps.app.goo.gl/example"), true);
  assert.equal(isAllowedGoogleMapsRedirect("https://www.google.co.id/maps/place/Test"), true);
  assert.equal(isAllowedGoogleMapsRedirect("https://google.evil.test/maps"), false);
  assert.deepEqual(extractGoogleMapsCoordinates("https://www.google.com/maps/place/Test/@-6.2,106.8,15z"), { latitude: -6.2, longitude: 106.8 });
});

test("worker map resolver stops as soon as a safe redirect contains coordinates", async () => {
  let calls = 0;
  const result = await resolveGoogleMapsShortUrl("https://maps.app.goo.gl/example", async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { Location: "https://www.google.com/maps/search/?api=1&query=-6.1754,106.8272" } });
  });
  assert.deepEqual(result, { latitude: -6.1754, longitude: 106.8272 });
  assert.equal(calls, 1);
});

test("worker map resolver derives coordinates from a Google ftid before anti-bot blocks the next request", async () => {
  const redirected = "https://maps.google.com/?q=Kampung+Makan,+Jakarta&ftid=0x2e69f0b34acfdb09:0x4c17a705106763c1&g_st=ic";
  assert.deepEqual(extractGoogleMapsFtidCoordinates(redirected), {
    latitude: -6.220061030687462,
    longitude: 106.73981756757684
  });
  let calls = 0;
  const result = await resolveGoogleMapsShortUrl("https://maps.app.goo.gl/uFAEvcaeRixfJtMT9?g_st=ic", async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { Location: redirected } });
  });
  assert.deepEqual(result, {
    latitude: -6.220061030687462,
    longitude: 106.73981756757684,
    label: "Kampung Makan"
  });
  assert.equal(calls, 1);
});

test("worker map resolver refuses a redirect outside Google", async () => {
  await assert.rejects(
    () => resolveGoogleMapsShortUrl("https://maps.app.goo.gl/example", async () => new Response(null, { status: 302, headers: { Location: "https://evil.test/track" } })),
    /UNSAFE_GOOGLE_MAPS_REDIRECT/
  );
});

test("worker map resolver reads place coordinates from Google's preview response", async () => {
  const page = '<html><head><link href="/maps/preview/place?authuser=0&amp;pb=encoded" as="fetch"></head><body>[null,null,3,0]</body></html>';
  const preview = `)]}'\n[null,null,null,null,[[3954.28,112.5394474,-7.6527434],[0,0,0]],null,[null,null,-7.6527434,112.5394474],"Mieyabe Noodle and Dimsum"]`;
  assert.deepEqual(extractGoogleMapsPreviewCoordinates(preview), { latitude: -7.6527434, longitude: 112.5394474 });
  const calls = [];
  const result = await resolveGoogleMapsShortUrl("https://maps.app.goo.gl/example", async url => {
    calls.push(url);
    if (calls.length === 1) return new Response(null, { status: 302, headers: { Location: "https://www.google.com/maps?q=Mieyabe&ftid=place-id" } });
    if (calls.length === 2) return new Response(page, { status: 200, headers: { "Content-Type": "text/html" } });
    return new Response(preview, { status: 200, headers: { "Content-Type": "text/plain" } });
  });
  assert.deepEqual(result, { latitude: -7.6527434, longitude: 112.5394474, label: "Mieyabe" });
  assert.equal(calls.length, 3);
  assert.match(calls[2], /^https:\/\/www\.google\.com\/maps\/preview\/place\?/);
});
