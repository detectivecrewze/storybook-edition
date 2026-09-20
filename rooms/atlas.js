(function (root) {
  "use strict";

  let standaloneVisited = false;
  const isFiniteCoordinate = (latitude, longitude) => Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
  const mapsUrl = location => `https://www.google.com/maps/search/?api=1&query=${Number(location.latitude)},${Number(location.longitude)}`;
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

  function locationCard(location, index, language) {
    const order = String(index + 1).padStart(2, "0");
    const card = element("article", "atlas-popup-card");
    const visual = element("figure", "atlas-popup-visual is-placeholder");
    const placeholder = element("span", "atlas-popup-placeholder", language === "en" ? "Memory point" : "Titik kenangan");
    visual.append(placeholder);

    if (location.photoUrl) {
      const image = element("img", "atlas-popup-photo");
      image.alt = location.label;
      image.loading = "lazy";
      image.src = location.photoUrl;
      image.addEventListener("load", () => visual.classList.remove("is-placeholder"), { once: true });
      image.onerror = () => image.remove();
      visual.append(image);
    }

    const copy = element("div", "atlas-popup-copy");
    const kicker = element("span", "atlas-popup-kicker", order);
    const title = element("h3", "atlas-popup-title", location.label);
    copy.append(kicker, title);

    if (location.note) {
      const noteScroll = element("div", "atlas-popup-note-scroll");
      noteScroll.tabIndex = 0;
      noteScroll.setAttribute("aria-label", language === "en" ? "Location story" : "Cerita lokasi");
      noteScroll.append(element("p", "atlas-popup-note", location.note));
      root.L?.DomEvent?.disableClickPropagation?.(noteScroll);
      root.L?.DomEvent?.disableScrollPropagation?.(noteScroll);
      copy.append(noteScroll);
    }

    card.append(visual, copy);
    return card;
  }

  function mount(host, atlasData, options = {}) {
    const language = options.language === "en" ? "en" : "id";
    const reducedMotion = Boolean(options.reducedMotion);
    const cinematic = options.cinematic !== undefined ? Boolean(options.cinematic) : !standaloneVisited;
    standaloneVisited = true;
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

    const bounds = root.L.latLngBounds(locations.map(location => [location.latitude, location.longitude]));
    const center = bounds.getCenter();
    const initialZoom = locations.length === 1 ? 12 : 11;

    map = root.L.map(mapNode, {
      center: center,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
      keyboard: true,
      tap: true,
      scrollWheelZoom: true
    });

    tileLayer = root.L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      subdomains: "abc",
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenZooming: false,
      updateWhenIdle: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
    });
    tileLayer.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors === 2 && map && !destroyed) {
        tileLayer.setUrl("https://tile.openstreetmap.de/{z}/{x}/{y}.png");
      }
      if (tileErrors < 5 || !notice.hidden) return;
      notice.hidden = false;
      notice.replaceChildren(element("strong", "", language === "en" ? "Map tiles are unavailable" : "Peta sedang tidak tersedia"), element("span", "", language === "en" ? "The location pins and Google Maps links still work." : "Pin lokasi dan tautan Google Maps tetap bisa digunakan."));
      const fallback = element("div", "atlas-tile-fallback"); fallback.append(element("h3", "", language === "en" ? "Open a place" : "Buka lokasi"));
      locations.forEach((location, index) => { const link = element("a", "", `${index + 1}. ${location.label} ↗`); link.href = mapsUrl(location); link.target = "_blank"; link.rel = "noopener noreferrer"; fallback.append(link); });
      mapFrame.append(fallback);
    });
    tileLayer.addTo(map);

    let route = null;
    if (locations.length >= 2) {
      route = root.L.polyline(locations.map(location => [location.latitude, location.longitude]), {
        color: "#c0392b",
        weight: 3,
        opacity: 0.9,
        dashArray: "8 6",
        lineCap: "round",
        className: "atlas-web-route"
      }).addTo(map);
    }

    const markers = locations.map((location, index) => {
      const icon = root.L.divIcon({
        className: "atlas-pin-shell",
        html: `<div class="atlas-pin-wrap"><span class="atlas-pin-ring"></span><div class="atlas-pin-head" id="atlas-pin-head-${index}"><span class="atlas-pin-num">${index + 1}</span></div><span class="atlas-pin-tail"></span><span class="atlas-pin-shadow"></span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -42]
      });
      const marker = root.L.marker([location.latitude, location.longitude], { icon, keyboard: true, opacity: 1 }).addTo(map);
      marker.bindPopup(locationCard(location, index, language), {
        className: "atlas-comic-popup",
        maxWidth: 248,
        minWidth: 236,
        autoPan: false
      });
      marker.on("click", (e) => {
        if (e?.originalEvent) {
          root.L?.DomEvent?.stopPropagation?.(e);
        }
        cancelAnimation();
        if (activeIndex === index && markers[index]?.isPopupOpen?.()) {
          return;
        }
        select(index);
      });
      return marker;
    });

    function updateActiveMarker(index) {
      markers.forEach((marker, i) => {
        const head = marker.getElement?.()?.querySelector(".atlas-pin-head") || document.getElementById(`atlas-pin-head-${i}`);
        if (head) head.classList.toggle("is-active", i === index);
      });
    }

    function openLocationPopup(index) {
      const marker = markers[index];
      marker?.openPopup();
      later(() => {
        if (destroyed || !map || !marker?.isPopupOpen?.()) return;
        const popup = map.getPopup()?.getElement?.();
        const container = map.getContainer?.();
        if (!popup || !container) return;
        const popupBounds = popup.getBoundingClientRect();
        const minHeadroom = container.clientWidth <= 600 ? 18 : 26;
        const topOverflow = frameBounds.top + minHeadroom - popupBounds.top;
        const bottomOverflow = popupBounds.bottom - (frameBounds.bottom - 12);
        // Leaflet autoPan remains disabled. This is a measured, one-time
        // correction after our comic card has its final rendered height.
        if (topOverflow > 0) map.panBy([0, -topOverflow], { animate: false });
        else if (bottomOverflow > 0) map.panBy([0, bottomOverflow], { animate: false });
      }, 0);
    }

    function getCameraCenterForPin(location, zoom) {
      if (!map) return [location.latitude, location.longitude];
      const size = map.getSize();
      const targetPoint = map.project([location.latitude, location.longitude], zoom);
      // Place the pin in the lower portion of the map so the comic popup
      // has ample headroom above it and never touches or clips the top edge.
      const isMobile = size.x <= 600;
      const ratio = isMobile ? 0.26 : 0.32;
      const minOffset = isMobile ? 90 : 130;
      const maxOffset = isMobile ? 125 : 185;
      const offsetY = Math.min(maxOffset, Math.max(minOffset, Math.round(size.y * ratio)));
      const cameraPoint = targetPoint.subtract([0, offsetY]);
      return map.unproject(cameraPoint, zoom);
    }

    function fitAll(animate = false) {
      if (locations.length === 1) {
        if (animate && !reducedMotion) {
          map.flyTo([locations[0].latitude, locations[0].longitude], 12, { duration: 0.65 });
        } else {
          map.setView([locations[0].latitude, locations[0].longitude], 12);
        }
      } else {
        if (animate && !reducedMotion) {
          map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 13, duration: 0.85 });
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        }
      }
    }

    let selectTimeout = null;
    let selectMoveHandler = null;

    function select(index, animate = true) {
      if (destroyed || !map || locations.length === 0) return;
      activeIndex = (index + locations.length) % locations.length;
      const location = locations[activeIndex];
      current.textContent = `${activeIndex + 1} / ${locations.length}`;
      updateActiveMarker(activeIndex);
      const targetZoom = 12;
      const cameraCenter = getCameraCenterForPin(location, targetZoom);

      if (selectTimeout) {
        clearTimeout(selectTimeout);
        selectTimeout = null;
      }
      if (selectMoveHandler) {
        map.off("moveend", selectMoveHandler);
        selectMoveHandler = null;
      }

      if (!reducedMotion && animate) {
        map.closePopup();
        map.flyTo(cameraCenter, targetZoom, {
          duration: 0.8,
          easeLinearity: 0.25
        });

        const targetIndex = activeIndex;
        selectMoveHandler = () => {
          map.off("moveend", selectMoveHandler);
          selectMoveHandler = null;
          if (selectTimeout) {
            clearTimeout(selectTimeout);
            selectTimeout = null;
          }
          if (!destroyed && map && activeIndex === targetIndex) {
            openLocationPopup(targetIndex);
          }
        };

        map.once("moveend", selectMoveHandler);
        selectTimeout = setTimeout(selectMoveHandler, 950);
        timers.add(selectTimeout);
      } else {
        map.setView(cameraCenter, targetZoom);
        openLocationPopup(activeIndex);
      }
    }

    let cinematicCancelled = false;
    let cancelAnimation = () => { cinematicCancelled = true; };

    function runJourneyAnimation() {
      if (cinematicCancelled || !cinematic || reducedMotion || locations.length === 0) {
        fitAll(false);
        if (locations.length === 1) {
          openLocationPopup(0);
          updateActiveMarker(0);
        } else {
          updateActiveMarker(-1);
          map.closePopup();
        }
        return;
      }

      let aborted = false;
      let moveTimeout = null;

      cancelAnimation = () => {
        cinematicCancelled = true;
        aborted = true;
        if (moveTimeout) { clearTimeout(moveTimeout); moveTimeout = null; }
        if (selectTimeout) { clearTimeout(selectTimeout); selectTimeout = null; }
        if (selectMoveHandler && map) {
          map.off("moveend", selectMoveHandler);
          selectMoveHandler = null;
        }
        map?.off("moveend");
      };

      const delay = ms => new Promise(res => {
        const t = setTimeout(res, ms);
        timers.add(t);
      });

      const flyToPin = (index, zoom = 13, duration = 1.4) => new Promise(resolve => {
        if (aborted || destroyed || !map) return resolve();
        activeIndex = index;
        current.textContent = `${index + 1} / ${locations.length}`;
        updateActiveMarker(index);
        const cameraCenter = getCameraCenterForPin(locations[index], zoom);
        map.flyTo(cameraCenter, zoom, {
          duration,
          easeLinearity: 0.25
        });

        const onMoveEnd = () => {
          map.off("moveend", onMoveEnd);
          if (!aborted && !destroyed && map) {
            openLocationPopup(index);
          }
          resolve();
        };
        map.once("moveend", onMoveEnd);
        moveTimeout = setTimeout(() => {
          map.off("moveend", onMoveEnd);
          if (!aborted && !destroyed && map) {
            openLocationPopup(index);
          }
          resolve();
        }, Math.round(duration * 1000) + 300);
        timers.add(moveTimeout);
      });

      (async () => {
        await delay(250);
        if (aborted || destroyed) return;

        for (let i = 0; i < locations.length; i++) {
          if (aborted || destroyed) return;
          await flyToPin(i, 12, 1.4);
          if (aborted || destroyed) return;
          if (i < locations.length - 1 || locations.length === 1) {
            await delay(1600);
          }
        }

        if (aborted || destroyed) return;

        if (locations.length >= 2) {
          await delay(1000);
          if (aborted || destroyed || !map) return;
          map.closePopup();
          updateActiveMarker(-1);
          map.flyToBounds(bounds, {
            padding: [40, 40],
            maxZoom: 14,
            duration: 1.5,
            easeLinearity: 0.25
          });
        }
      })();
    }

    on(previous, "click", () => { cancelAnimation(); select(activeIndex - 1); });
    on(next, "click", () => { cancelAnimation(); select(activeIndex + 1); });
    on(fit, "click", () => { cancelAnimation(); fitAll(true); updateActiveMarker(-1); map.closePopup(); });
    on(shell, "keydown", event => {
      cancelAnimation();
      if (event.key === "ArrowLeft") { event.preventDefault(); select(activeIndex - 1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); select(activeIndex + 1); }
    });

    // Wait for the first tile to paint before sizing the map and starting the
    // cinematic tour. This prevents the blank-map flash that iOS Safari shows
    // when invalidateSize fires before any tile is on screen.
    let startedMap = false;
    const onFirstTile = () => {
      if (startedMap || destroyed) return;
      startedMap = true;
      map.invalidateSize({ pan: false, animate: false });
      if (cinematic && !reducedMotion && !cinematicCancelled) {
        runJourneyAnimation();
      } else {
        fitAll(false);
        if (locations.length === 1) {
          openLocationPopup(0);
          updateActiveMarker(0);
        } else {
          updateActiveMarker(-1);
          map.closePopup();
        }
      }
    };
    tileLayer.once("tileload", onFirstTile);
    // Fallback: if tiles take more than 1.2 s (e.g. offline), start anyway.
    later(onFirstTile, 1200);

    const dispose = () => {
      cancelAnimation();
      destroyed = true; timers.forEach(clearTimeout); timers.clear(); listeners.splice(0).forEach(remove => remove());
      if (tileLayer) tileLayer.off(); if (map) { map.off(); map.remove(); map = null; } host.replaceChildren();
    };
    dispose.resize = () => { if (!destroyed && map) map.invalidateSize({ pan: false, animate: false }); };
    return dispose;
  }

  root.StorybookAtlasRoom = { mount };
})(typeof globalThis !== "undefined" ? globalThis : window);
