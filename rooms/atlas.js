(function (root) {
  "use strict";

  const isFiniteCoordinate = (latitude, longitude) => Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
  const mapsUrl = location => `https://www.google.com/maps/search/?api=1&query=${Number(location.latitude)},${Number(location.longitude)}`;
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

  function locationCard(location, index, language) {
    const card = element("article", "atlas-popup-card");
    if (location.photoUrl) { const image = element("img", "atlas-popup-photo"); image.alt = location.label; image.loading = "lazy"; image.src = location.photoUrl; image.onerror = () => image.remove(); card.append(image); }
    const badge = element("span", "atlas-popup-number", String(index + 1).padStart(2, "0"));
    const title = element("h3", "", location.label);
    card.append(badge, title);
    if (location.note) card.append(element("p", "", location.note));
    const link = element("a", "atlas-map-link", language === "en" ? "Open in Google Maps ↗" : "Buka di Google Maps ↗");
    link.href = mapsUrl(location); link.target = "_blank"; link.rel = "noopener noreferrer"; card.append(link);
    return card;
  }

  function mount(host, atlasData, options = {}) {
    const language = options.language === "en" ? "en" : "id";
    const reducedMotion = Boolean(options.reducedMotion);
    const locations = (atlasData?.locations || []).filter(location => location.label && isFiniteCoordinate(location.latitude, location.longitude)).slice(0, 10);
    const timers = new Set(); const listeners = []; let map = null; let tileLayer = null; let activeIndex = 0; let destroyed = false; let tileErrors = 0;
    const on = (target, type, handler, settings) => { target.addEventListener(type, handler, settings); listeners.push(() => target.removeEventListener(type, handler, settings)); };
    const later = (handler, delay) => { const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) handler(); }, delay); timers.add(timer); };
    host.replaceChildren();

    if (!locations.length || !root.L) {
      host.append(element("p", "room-empty", language === "en" ? "No valid places have been added yet." : "Belum ada lokasi valid yang ditambahkan."));
      return () => { host.replaceChildren(); };
    }

    const shell = element("div", "atlas-room");
    const stats = element("div", "atlas-stats");
    const placeStat = element("div", "atlas-stat");
    placeStat.append(
      element("strong", "", String(locations.length)),
      element("span", "", language === "en" ? (locations.length === 1 ? "place" : "places") : "tempat")
    );
    stats.append(placeStat);
    const mapFrame = element("div", "atlas-map-frame");
    const mapNode = element("div", "atlas-map"); mapNode.setAttribute("aria-label", language === "en" ? "Interactive map of meaningful places" : "Peta interaktif tempat-tempat berarti");
    const noise = element("div", "map-noise");
    const notice = element("div", "atlas-map-notice"); notice.hidden = true;
    mapFrame.append(mapNode, noise, notice);
    const controls = element("div", "atlas-controls");
    const previous = element("button", "atlas-control", "←"); previous.type = "button"; previous.setAttribute("aria-label", language === "en" ? "Previous place" : "Lokasi sebelumnya");
    const current = element("span", "atlas-current", `1 / ${locations.length}`);
    const next = element("button", "atlas-control", "→"); next.type = "button"; next.setAttribute("aria-label", language === "en" ? "Next place" : "Lokasi berikutnya");
    const fit = element("button", "atlas-fit", language === "en" ? "See all places" : "Lihat semua lokasi"); fit.type = "button";
    controls.append(previous, current, next, fit); shell.append(stats, mapFrame, controls); host.append(shell);

    map = root.L.map(mapNode, { zoomControl: true, attributionControl: true, keyboard: true, tap: true, scrollWheelZoom: true });
    tileLayer = root.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, subdomains: "abc", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
    tileLayer.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors < 4 || !notice.hidden) return;
      notice.hidden = false;
      notice.replaceChildren(element("strong", "", language === "en" ? "Map tiles are unavailable" : "Peta sedang tidak tersedia"), element("span", "", language === "en" ? "The location pins and Google Maps links still work." : "Pin lokasi dan tautan Google Maps tetap bisa digunakan."));
      const fallback = element("div", "atlas-tile-fallback"); fallback.append(element("h3", "", language === "en" ? "Open a place" : "Buka lokasi"));
      locations.forEach((location, index) => { const link = element("a", "", `${index + 1}. ${location.label} ↗`); link.href = mapsUrl(location); link.target = "_blank"; link.rel = "noopener noreferrer"; fallback.append(link); });
      mapFrame.append(fallback);
    });
    tileLayer.addTo(map);
    const bounds = root.L.latLngBounds(locations.map(location => [location.latitude, location.longitude]));
    let route = null;
    if (locations.length >= 2) {
      route = root.L.polyline(locations.map(location => [location.latitude, location.longitude]), { color: "#c0392b", weight: 2.5, opacity: .85, dashArray: "8 5", lineCap: "round", className: "atlas-web-route" }).addTo(map);
      if (!reducedMotion && route._path) { const length = route._path.getTotalLength?.() || 1000; route._path.style.strokeDasharray = `${length}`; route._path.style.strokeDashoffset = `${length}`; requestAnimationFrame(() => { route._path.style.transition = "stroke-dashoffset 1.2s ease"; route._path.style.strokeDashoffset = "0"; }); }
    }
    const markers = locations.map((location, index) => {
      const icon = root.L.divIcon({
        className: "atlas-pin-shell",
        html: `<div class="atlas-pin-wrap"><div class="atlas-pin-head" id="atlas-pin-head-${index}"><span class="atlas-pin-num">${index + 1}</span></div><div class="atlas-pin-shadow"></div></div>`,
        iconSize: [28, 34],
        iconAnchor: [14, 34],
        popupAnchor: [0, -34]
      });
      const marker = root.L.marker([location.latitude, location.longitude], { icon, keyboard: true, opacity: reducedMotion ? 1 : 0 }).addTo(map);
      marker.bindPopup(locationCard(location, index, language), { className: "atlas-comic-popup", maxWidth: 320, minWidth: 260, autoPanPadding: [20, 20] });
      marker.on("click", () => {
        activeIndex = index;
        current.textContent = `${index + 1} / ${locations.length}`;
        updateActiveMarker(activeIndex);
      });
      if (!reducedMotion) later(() => marker.setOpacity(1), index * 100); return marker;
    });
    function updateActiveMarker(index) {
      markers.forEach((marker, i) => {
        const head = marker.getElement?.()?.querySelector(".atlas-pin-head") || document.getElementById(`atlas-pin-head-${i}`);
        if (head) head.classList.toggle("is-active", i === index);
      });
    }
    function fitAll() {
      if (locations.length === 1) {
        map.flyTo([locations[0].latitude, locations[0].longitude], 13, { animate: !reducedMotion, duration: reducedMotion ? 0 : 0.65 });
      } else {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: !reducedMotion, duration: reducedMotion ? 0 : 0.85 });
      }
    }
    function select(index) {
      activeIndex = (index + locations.length) % locations.length;
      const location = locations[activeIndex];
      current.textContent = `${activeIndex + 1} / ${locations.length}`;
      updateActiveMarker(activeIndex);
      map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 13), { animate: !reducedMotion, duration: reducedMotion ? 0 : 0.65 });
      markers[activeIndex].openPopup();
    }
    on(previous, "click", () => select(activeIndex - 1)); on(next, "click", () => select(activeIndex + 1)); on(fit, "click", fitAll);
    on(shell, "keydown", event => { if (event.key === "ArrowLeft") { event.preventDefault(); select(activeIndex - 1); } else if (event.key === "ArrowRight") { event.preventDefault(); select(activeIndex + 1); } });
    requestAnimationFrame(() => {
      map.invalidateSize();
      fitAll();
      updateActiveMarker(0);
      if (locations.length > 0 && markers[0]) {
        later(() => markers[0].openPopup(), reducedMotion ? 50 : 250);
      }
    });
    return () => {
      destroyed = true; timers.forEach(clearTimeout); timers.clear(); listeners.splice(0).forEach(remove => remove());
      if (tileLayer) tileLayer.off(); if (map) { map.off(); map.remove(); map = null; } host.replaceChildren();
    };
  }

  root.StorybookAtlasRoom = { mount };
})(typeof globalThis !== "undefined" ? globalThis : window);
