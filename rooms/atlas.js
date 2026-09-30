(function (root) {
  "use strict";

  let standaloneVisited = false;
  const isFiniteCoordinate = (latitude, longitude) => Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

  function locationHeading(location) {
    return location?.title || location?.label || "";
  }

  function locationCard(location, index, language, { compact = false } = {}) {
    const order = String(index + 1).padStart(2, "0");
    const heading = locationHeading(location);
    const card = element("article", `atlas-popup-card${compact ? " is-cinematic" : ""}`);
    const visual = element("figure", "atlas-popup-visual is-placeholder");
    const placeholder = element("span", "atlas-popup-placeholder", language === "en" ? "Memory point" : "Titik kenangan");
    visual.append(placeholder);

    if (location.photoUrl) {
      const image = element("img", "atlas-popup-photo");
      image.alt = heading;
      image.loading = "lazy";
      image.src = location.photoUrl;
      image.addEventListener("load", () => visual.classList.remove("is-placeholder"), { once: true });
      image.onerror = () => image.remove();
      visual.append(image);
    }

    const copy = element("div", "atlas-popup-copy");
    const kicker = element("span", "atlas-popup-kicker", order);
    const title = element("h3", "atlas-popup-title", heading);
    copy.append(kicker, title);

    if (compact) {
      const reveal = element("p", "atlas-popup-reveal");
      reveal.append(
        element("span", "", language === "en" ? "Next · reveal the story" : "Next · buka ceritanya"),
        element("b", "atlas-popup-reveal-arrow", "→")
      );
      copy.append(reveal);
    }

    if (!compact && location.label && location.label !== heading) {
      const place = element("p", "atlas-popup-place", location.label);
      place.setAttribute("aria-label", language === "en" ? "Place" : "Tempat");
      copy.append(place);
    }

    if (!compact && location.note) {
      const noteScroll = element("div", "atlas-popup-note-scroll");
      noteScroll.tabIndex = 0;
      noteScroll.setAttribute("aria-label", language === "en" ? "Location story" : "Cerita lokasi");
      const paragraphs = String(location.note).split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
      if (paragraphs.length > 1) {
        paragraphs.forEach(paragraph => {
          noteScroll.append(element("p", "atlas-popup-note", paragraph));
        });
      } else {
        noteScroll.append(element("p", "atlas-popup-note", location.note));
      }
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
    const experience = options.experience || {};
    const motion = experience.motion === "glide" ? "glide" : "swing";
    const characterSource = String(experience.character || "");
    const spriteSources = Object.freeze({ ...(experience.sprites || {}) });
    const motionProfile = Object.freeze({ ...(experience.motionProfile || {}) });
    const hasCharacter = Boolean(characterSource || Object.values(spriteSources).some(Boolean));
    const localized = value => typeof value === "string" ? value : String(value?.[language] || value?.id || value?.en || "");
    standaloneVisited = true;
    const locations = (atlasData?.locations || []).filter(location => locationHeading(location) && isFiniteCoordinate(location.latitude, location.longitude)).slice(0, 10);
    const timers = new Set(); const listeners = []; let map = null; let tileLayer = null; let activeIndex = -1; let popupCompact = false; let destroyed = false; let tileErrors = 0; let activeCharacterAnimation = null; let introRunning = false; let introTransitionVersion = 0;
    const on = (target, type, handler, settings) => { target.addEventListener(type, handler, settings); listeners.push(() => target.removeEventListener(type, handler, settings)); };
    const later = (handler, delay) => { const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) handler(); }, delay); timers.add(timer); return timer; };
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
    const characterLayer = element("div", `atlas-character-layer is-${motion}`); characterLayer.setAttribute("aria-hidden", "true");
    const character = element("div", "atlas-character"); character.hidden = true; character.dataset.phase = "launch"; character.dataset.direction = "right";
    const characterSprite = element("img", "atlas-character-sprite"); characterSprite.alt = ""; characterSprite.draggable = false;
    characterSprite.onerror = () => { if (characterSource && characterSprite.getAttribute("src") !== characterSource) characterSprite.src = characterSource; };
    const motionTrail = element("span", "atlas-motion-trail"); motionTrail.hidden = true; character.append(characterSprite); characterLayer.append(motionTrail, character);
    const intro = element("div", "atlas-game-intro"); intro.hidden = true;
    const introPanel = element("div", "atlas-game-intro__panel");
    const introKicker = element("span", "atlas-game-intro__kicker", language === "en" ? "Atlas mission" : "Misi Atlas");
    const introTitle = element("h3", "", localized(experience.introTitle) || (language === "en" ? "Choose a memory point" : "Pilih titik kenangan"));
    const introMessage = element("p", "", localized(experience.introMessage) || (language === "en" ? "Choose a meaningful place to open its story." : "Pilih tempat berarti untuk membuka ceritanya."));
    const skipIntro = element("button", "atlas-intro-skip", language === "en" ? "Skip entrance" : "Lewati pembuka"); skipIntro.type = "button";
    introPanel.append(introKicker, introTitle, introMessage, skipIntro); intro.append(introPanel);
    mapFrame.append(mapNode, noise, characterLayer, notice, intro);
    const controls = element("div", "atlas-controls");
    const previous = element("button", "atlas-control", "←"); previous.type = "button"; previous.setAttribute("aria-label", language === "en" ? "Previous place" : "Lokasi sebelumnya");
    const current = element("span", "atlas-current", `0 / ${locations.length}`);
    const next = element("button", "atlas-control", "→"); next.type = "button"; next.setAttribute("aria-label", language === "en" ? "Next place" : "Lokasi berikutnya");
    const fit = element("button", "atlas-fit", language === "en" ? "See all places" : "Lihat semua lokasi"); fit.type = "button";
    const replay = element("button", "atlas-replay", language === "en" ? "Replay entrance" : "Ulangi pembuka"); replay.type = "button";
    controls.append(previous, current, next, fit, replay); shell.append(stats, mapFrame, controls); host.append(shell); previous.disabled = true; previous.setAttribute("aria-disabled", "true");

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

    tileLayer = root.L.maplibreGL({
      style: "https://tiles.openfreemap.org/styles/liberty",
      interactive: false
    });
    tileLayer.addTo(map);
    const vectorMap = tileLayer.getMaplibreMap();
    const showMapFailure = () => {
      if (!notice.hidden) return;
      notice.hidden = false;
      notice.replaceChildren(element("strong", "", language === "en" ? "Map is temporarily unavailable" : "Peta sedang tidak tersedia"), element("span", "", language === "en" ? "Every saved place remains available in the list." : "Semua tempat yang tersimpan tetap tersedia di daftar."));
      const fallback = element("div", "atlas-tile-fallback"); fallback.append(element("h3", "", language === "en" ? "Saved places" : "Tempat tersimpan"));
      const list = element("ol", "atlas-fallback-list");
      locations.forEach((location, index) => { const item = element("li", "atlas-fallback-place"); item.append(element("strong", "", `${String(index + 1).padStart(2, "0")} · ${locationHeading(location)}`)); if (location.note) item.append(element("span", "", location.note)); list.append(item); });
      fallback.append(list); mapFrame.append(fallback);
    };
    vectorMap.on("error", () => {
      tileErrors += 1;
      if (tileErrors === 1) later(() => { if (!vectorMap.isStyleLoaded?.()) showMapFailure(); }, 2600);
    });

    const markers = locations.map((location, index) => {
      const icon = root.L.divIcon({
        className: "atlas-pin-shell",
        html: `<div class="atlas-pin-wrap"><span class="atlas-pin-ring"></span><div class="atlas-pin-head" id="atlas-pin-head-${index}"><span class="atlas-pin-num">${index + 1}</span></div><span class="atlas-pin-tail"></span><span class="atlas-pin-shadow"></span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -42]
      });
      const marker = root.L.marker([location.latitude, location.longitude], { icon, keyboard: true, opacity: 1 }).addTo(map);
      marker.bindPopup(locationCard(location, index, language, { compact: false }), {
        className: "atlas-comic-popup",
        maxWidth: 270,
        minWidth: 190,
        autoPan: true,
        keepInView: true,
        autoPanPadding: [18, 18]
      });
      marker.on("click", (e) => {
        if (e?.originalEvent) {
          root.L?.DomEvent?.stopPropagation?.(e);
        }
        const popupWasOpen = activeIndex === index && markers[index]?.isPopupOpen?.() && map?.getZoom() >= 15;
        cancelAnimation();
        if (popupWasOpen) {
          openLocationPopup(index, { compact: false });
          return;
        }
        select(index);
      });
      marker.on("keypress", e => {
        const key = e?.originalEvent?.key;
        if (key !== "Enter" && key !== " ") return;
        root.L?.DomEvent?.stop?.(e);
        cancelAnimation();
        select(index);
      });
      return marker;
    });

    let characterIndex = -1;
    let characterAnchorIndex = -1;
    let characterFrozen = false;
    let characterPoint = null;
    let activeTrailAnimation = null;
    let characterMoveToken = 0;
    const characterPhaseTimers = new Set();
    const spriteCache = [];

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    function preloadCharacterSprites() {
      const sources = [...new Set([characterSource, ...Object.values(spriteSources)].filter(Boolean))];
      return Promise.allSettled(sources.map(source => new Promise(resolve => {
        const image = new Image();
        spriteCache.push(image);
        image.onload = () => { const decoded = image.decode?.(); decoded?.then(resolve).catch(resolve) || resolve(); };
        image.onerror = resolve;
        image.src = source;
      })));
    }

    const spriteReadyPromise = preloadCharacterSprites();

    function pointForLocation(index) {
      if (!map || index < 0 || !locations[index]) return null;
      const location = locations[index];
      return map.latLngToContainerPoint([location.latitude, location.longitude]);
    }

    function setCharacterSprite(phase) {
      const source = String(spriteSources[phase] || characterSource || "");
      character.dataset.phase = phase;
      if (!source || characterSprite.getAttribute("src") === source) return;
      characterSprite.src = source;
    }

    function setCharacterDirection(direction) {
      character.dataset.direction = direction < 0 ? "left" : "right";
      character.style.setProperty("--atlas-facing", direction < 0 ? "-1" : "1");
    }

    function setCharacterPoint(point) {
      if (!point || !hasCharacter) return;
      characterPoint = { x: Number(point.x), y: Number(point.y) };
      character.style.left = `${characterPoint.x}px`;
      character.style.top = `${characterPoint.y}px`;
      character.hidden = false;
    }

    function hideCharacter({ resetAnchor = false } = {}) {
      character.hidden = true;
      motionTrail.hidden = true;
      if (resetAnchor) {
        characterAnchorIndex = -1;
        characterIndex = -1;
        characterPoint = null;
      }
    }

    function syncCharacter() {
      if (destroyed || character.hidden || characterFrozen || activeCharacterAnimation || !map || characterAnchorIndex < 0) return;
      setCharacterPoint(pointForLocation(characterAnchorIndex));
    }

    function clearCharacterPhaseTimers() {
      characterPhaseTimers.forEach(timer => { clearTimeout(timer); timers.delete(timer); });
      characterPhaseTimers.clear();
    }

    function scheduleCharacterPhase(phase, delay) {
      const timer = setTimeout(() => {
        characterPhaseTimers.delete(timer);
        timers.delete(timer);
        if (!destroyed) setCharacterSprite(phase);
      }, delay);
      characterPhaseTimers.add(timer);
      timers.add(timer);
    }

    function cancelCharacterAnimation() {
      characterMoveToken += 1;
      clearCharacterPhaseTimers();
      if (activeCharacterAnimation) activeCharacterAnimation.cancel();
      if (activeTrailAnimation) activeTrailAnimation.cancel();
      activeCharacterAnimation = null;
      activeTrailAnimation = null;
      motionTrail.hidden = true;
      character.classList.remove("is-moving", "is-arriving", "is-walking");
    }

    function delay(ms) {
      return new Promise(resolve => later(resolve, ms));
    }

    function cubicPoint(start, controlOne, controlTwo, end, progress) {
      const inverse = 1 - progress;
      return {
        x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlOne.x + 3 * inverse * progress ** 2 * controlTwo.x + progress ** 3 * end.x,
        y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlOne.y + 3 * inverse * progress ** 2 * controlTwo.y + progress ** 3 * end.y
      };
    }

    function buildMotionPath(start, end, { opening = false } = {}) {
      const width = mapNode.clientWidth || 320;
      const height = mapNode.clientHeight || 420;
      const lift = Math.max(motion === "swing" ? 72 : 42, height * Number(motionProfile.arcHeight || (motion === "swing" ? .24 : .13)));
      const direction = end.x >= start.x ? 1 : -1;
      const controlOne = motion === "swing"
        ? { x: start.x + (end.x - start.x) * .28, y: Math.min(start.y, end.y) - lift * (opening ? 1.18 : 1) }
        : { x: start.x + (end.x - start.x) * .34, y: start.y + (end.y - start.y) * .12 - lift };
      const controlTwo = motion === "swing"
        ? { x: start.x + (end.x - start.x) * .72, y: Math.min(start.y, end.y) - lift * .62 }
        : { x: start.x + (end.x - start.x) * .72, y: end.y - lift * .28 };
      const samples = opening ? [0, .16, .34, .55, .76, 1] : [0, .18, .42, .68, .86, 1];
      return { direction, points: samples.map(progress => ({ ...cubicPoint(start, controlOne, controlTwo, end, progress), progress })), width, height };
    }

    function contextualStart(targetIndex, fromIndex) {
      const target = pointForLocation(targetIndex);
      const width = mapNode.clientWidth || 320;
      const height = mapNode.clientHeight || 420;
      const padding = motion === "swing" ? 76 : 112;
      const targetLocation = locations[targetIndex];
      const sourceLocation = fromIndex >= 0 && locations[fromIndex] ? locations[fromIndex] : center;
      let horizontal = Number(sourceLocation.lng ?? sourceLocation.longitude) - Number(targetLocation.longitude);
      let vertical = -(Number(sourceLocation.lat ?? sourceLocation.latitude) - Number(targetLocation.latitude));
      if (Math.abs(horizontal) + Math.abs(vertical) < .00001) {
        horizontal = targetIndex % 2 === 0 ? -1 : 1;
        vertical = motion === "glide" ? -1 : .35;
      }
      if (motion === "glide" && fromIndex < 0) {
        return { x: horizontal >= 0 ? width + padding : -padding, y: -padding * .65 };
      }
      if (Math.abs(horizontal) >= Math.abs(vertical)) {
        return {
          x: horizontal >= 0 ? width + padding : -padding,
          y: clamp(target.y + Math.sign(vertical || 1) * height * (motion === "swing" ? .16 : .08), height * .16, height * .76)
        };
      }
      return {
        x: clamp(target.x + Math.sign(horizontal || 1) * width * .2, width * .12, width * .88),
        y: vertical >= 0 ? height + padding : -padding
      };
    }

    function openingEndpoints() {
      const width = mapNode.clientWidth || 320;
      const height = mapNode.clientHeight || 420;
      const seed = Math.abs(Math.round(locations.reduce((total, location) => total + location.latitude * 1000 + location.longitude * 1000, 0)));
      const leftToRight = (seed + (motion === "glide" ? 1 : 0)) % 2 === 0;
      const startX = leftToRight ? -110 : width + 110;
      const endX = leftToRight ? width + 110 : -110;
      if (motion === "swing") {
        return { start: { x: startX, y: height * .7 }, end: { x: endX, y: height * .34 } };
      }
      return { start: { x: startX, y: -82 }, end: { x: endX, y: height * .62 } };
    }

    function buildWalkingOpeningPath(start, end) {
      const baseline = clamp((mapNode.clientHeight || 420) * .35, 104, 178);
      const samples = [0, .16, .34, .54, .74, 1];
      return {
        kind: "walk",
        direction: end.x >= start.x ? 1 : -1,
        width: mapNode.clientWidth || 320,
        height: mapNode.clientHeight || 420,
        points: samples.map(progress => ({ x: start.x + (end.x - start.x) * progress, y: baseline, progress }))
      };
    }

    function frameRotation(points, index, kind = "flight") {
      if (kind === "walk") return 0;
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
      return clamp(angle * (motion === "swing" ? .48 : .3), motion === "swing" ? -28 : -15, motion === "swing" ? 28 : 15);
    }

    function animateMotionTrail(path, duration) {
      motionTrail.hidden = false;
      if (!motionTrail.animate) return;
      if (motion === "swing") {
        const anchor = { x: clamp((path.points[0].x + path.points.at(-1).x) * .5, 22, path.width - 22), y: -10 };
        const frames = path.points.map((point, index) => {
          const deltaX = point.x - anchor.x;
          const deltaY = point.y - anchor.y;
          return {
            left: `${anchor.x}px`, top: `${anchor.y}px`, height: `${Math.hypot(deltaX, deltaY)}px`,
            transform: `rotate(${Math.atan2(deltaX, deltaY) * -180 / Math.PI}deg)`,
            opacity: index === 0 || index === path.points.length - 1 ? 0 : .78,
            offset: point.progress
          };
        });
        activeTrailAnimation = motionTrail.animate(frames, { duration, easing: "linear", fill: "both" });
      } else {
        const frames = path.points.map((point, index) => ({
          left: `${point.x}px`, top: `${point.y + 18}px`,
          transform: `translate(-50%,-50%) rotate(${frameRotation(path.points, index, path.kind)}deg) scale(${path.kind === "walk" ? 1 : index === 0 ? .65 : 1})`,
          opacity: index === 0 || index === path.points.length - 1 ? 0 : .5,
          offset: point.progress
        }));
        activeTrailAnimation = motionTrail.animate(frames, { duration, easing: "linear", fill: "both" });
      }
    }

    async function animateCharacterPath(path, { duration, arrival = false, targetIndex = -1 } = {}) {
      if (!hasCharacter || !path?.points?.length) return true;
      cancelCharacterAnimation();
      const moveToken = characterMoveToken;
      characterFrozen = true;
      setCharacterDirection(path.direction);
      setCharacterSprite(path.kind === "walk" ? "travel" : "launch");
      setCharacterPoint(path.points[0]);
      character.classList.add("is-moving");
      character.classList.toggle("is-walking", path.kind === "walk");
      if (path.kind !== "walk") {
        scheduleCharacterPhase("travel", duration * .14);
        scheduleCharacterPhase("turn", duration * .46);
        scheduleCharacterPhase("approach", duration * .74);
      }
      const frames = path.points.map((point, index) => ({
        left: `${point.x}px`, top: `${point.y}px`,
        transform: path.kind === "walk"
          ? "translate(-50%,-82%) rotate(0deg) scale(1)"
          : `translate(-50%,-82%) rotate(${frameRotation(path.points, index, path.kind)}deg) scale(${index === 0 ? .88 : index === path.points.length - 1 ? 1 : 1.04})`,
        opacity: arrival ? 1 : (index === 0 || index === path.points.length - 1 ? 0 : 1),
        offset: point.progress
      }));
      animateMotionTrail(path, duration);
      const animation = character.animate(frames, { duration, easing: "linear", fill: "both" });
      activeCharacterAnimation = animation;
      try { await animation.finished; } catch { return false; }
      if (destroyed || moveToken !== characterMoveToken || activeCharacterAnimation !== animation) return false;
      animation.cancel();
      activeCharacterAnimation = null;
      activeTrailAnimation?.cancel();
      activeTrailAnimation = null;
      motionTrail.hidden = true;
      clearCharacterPhaseTimers();
      const destination = path.points.at(-1);
      setCharacterPoint(destination);
      if (!arrival) {
        characterFrozen = false;
        character.classList.remove("is-moving", "is-walking");
        hideCharacter({ resetAnchor: true });
        return true;
      }
      characterIndex = targetIndex;
      characterAnchorIndex = targetIndex;
      setCharacterSprite("land");
      character.classList.remove("is-moving");
      character.classList.add("is-arriving");
      await delay(Number(motionProfile.arrivalHold || (motion === "swing" ? 190 : 220)));
      if (destroyed || moveToken !== characterMoveToken) return false;
      const fade = character.animate([{ opacity: 1, transform: "translate(-50%,-82%) scale(1)" }, { opacity: 0, transform: "translate(-50%,-78%) scale(.82)" }], { duration: 190, easing: "ease-out", fill: "both" });
      activeCharacterAnimation = fade;
      try { await fade.finished; } catch { return false; }
      if (moveToken !== characterMoveToken) return false;
      fade.cancel();
      activeCharacterAnimation = null;
      characterFrozen = false;
      character.classList.remove("is-arriving");
      hideCharacter();
      return true;
    }

    function moveCharacterTo(index, { fromIndex = -1 } = {}) {
      const targetIndex = (index + locations.length) % locations.length;
      const target = pointForLocation(targetIndex);
      if (!target || !hasCharacter || reducedMotion) {
        characterIndex = targetIndex;
        characterAnchorIndex = targetIndex;
        hideCharacter();
        return Promise.resolve(true);
      }
      const logicalFrom = fromIndex >= 0 ? fromIndex : characterAnchorIndex;
      const start = contextualStart(targetIndex, logicalFrom);
      const path = buildMotionPath(start, target);
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      const minimum = Number(motionProfile.minDuration || (motion === "swing" ? 980 : 1080));
      const maximum = Number(motionProfile.maxDuration || (motion === "swing" ? 1450 : 1550));
      const duration = clamp(distance * (motion === "swing" ? 2.35 : 2.55), minimum, maximum);
      return animateCharacterPath(path, { duration, arrival: true, targetIndex });
    }

    function runCharacterFlyThrough() {
      if (!hasCharacter || reducedMotion) return Promise.resolve(true);
      const { start, end } = openingEndpoints();
      const path = motionProfile.openingMode === "walk" ? buildWalkingOpeningPath(start, end) : buildMotionPath(start, end, { opening: true });
      const duration = Number(motionProfile.openingDuration || (motion === "swing" ? 2900 : 3100));
      return animateCharacterPath(path, { duration, arrival: false });
    }
    function updateActiveMarker(index) {
      markers.forEach((marker, i) => {
        const head = marker.getElement?.()?.querySelector(".atlas-pin-head") || document.getElementById(`atlas-pin-head-${i}`);
        if (head) head.classList.toggle("is-active", i === index);
      });
    }

    function openLocationPopup(index, { compact = false } = {}) {
      popupCompact = compact;
      const marker = markers[index];
      marker?.setPopupContent(locationCard(locations[index], index, language, { compact }));
      marker?.openPopup();
      later(() => {
        if (destroyed || !map || !marker?.isPopupOpen?.()) return;
        const container = map.getContainer?.();
        const popup = marker?.getPopup?.()?.getElement?.() || map?._popup?.getElement?.() || container?.querySelector?.(".leaflet-popup");
        if (!popup || !container) return;
        const frameBounds = container.getBoundingClientRect();
        const popupBounds = popup.getBoundingClientRect();
        const minHeadroom = container.clientWidth <= 600 ? 32 : 36;
        const topOverflow = frameBounds.top + minHeadroom - popupBounds.top;
        const bottomOverflow = popupBounds.bottom - (frameBounds.bottom - 14);
        // After Leaflet keeps the popup within the horizontal bounds, make one
        // vertical correction after the comic card has its final rendered height.
        if (topOverflow > 0) map.panBy([0, -topOverflow], { animate: false });
        else if (bottomOverflow > 0) map.panBy([0, bottomOverflow], { animate: false });
      }, 40);
    }

    function getCameraCenterForPin(location, zoom) {
      if (!map) return [location.latitude, location.longitude];
      const size = map.getSize();
      const targetPoint = map.project([location.latitude, location.longitude], zoom);
      // Place the pin in the lower portion of the map so the comic popup
      // has ample headroom above it and never touches or clips the top edge.
      const isMobile = size.x <= 600;
      const bottomClearance = isMobile ? 65 : 85;
      const targetPinY = Math.max(Math.round(size.y * 0.65), size.y - bottomClearance);
      const offsetY = Math.max(isMobile ? 120 : 145, targetPinY - Math.round(size.y / 2));
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

    function updateNavigationState() {
      current.textContent = activeIndex < 0 ? `0 / ${locations.length}` : `${activeIndex + 1} / ${locations.length}`;
      previous.disabled = activeIndex < 0;
      previous.setAttribute("aria-disabled", activeIndex < 0 ? "true" : "false");
    }

    function setOverviewState({ fitMap = false, animate = false } = {}) {
      activeIndex = -1;
      popupCompact = false;
      updateNavigationState();
      updateActiveMarker(-1);
      map?.closePopup();
      hideCharacter({ resetAnchor: true });
      if (fitMap) fitAll(animate);
    }

    function select(index, animate = true) {
      if (destroyed || !map || locations.length === 0) return;
      const fromIndex = activeIndex;
      activeIndex = (index + locations.length) % locations.length;
      const location = locations[activeIndex];
      updateNavigationState();
      updateActiveMarker(activeIndex);
      const targetZoom = 15;
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
        characterFrozen = true;
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
            moveCharacterTo(targetIndex, { fromIndex }).then(completed => {
              if (completed && !destroyed && activeIndex === targetIndex) openLocationPopup(targetIndex);
            });
          }
        };

        map.once("moveend", selectMoveHandler);
        selectTimeout = setTimeout(selectMoveHandler, 950);
        timers.add(selectTimeout);
      } else {
        map.setView(cameraCenter, targetZoom);
        moveCharacterTo(activeIndex, { fromIndex }).then(completed => { if (completed) openLocationPopup(activeIndex); });
      }
    }

    let cinematicCancelled = false;

    function finishIntro({ immediate = false } = {}) {
      const transitionVersion = ++introTransitionVersion;
      introRunning = false;
      shell.classList.remove("is-atlas-intro-playing");
      if (immediate || reducedMotion) {
        intro.classList.remove("is-closing");
        intro.hidden = true;
        return;
      }
      intro.classList.add("is-closing");
      later(() => {
        if (transitionVersion !== introTransitionVersion) return;
        intro.hidden = true;
        intro.classList.remove("is-closing");
      }, 420);
    }

    function clearSelectionMotion() {
      if (selectTimeout) { clearTimeout(selectTimeout); selectTimeout = null; }
      if (selectMoveHandler && map) { map.off("moveend", selectMoveHandler); selectMoveHandler = null; }
    }

    function cancelAnimation() {
      cinematicCancelled = true;
      finishIntro({ immediate: true });
      cancelCharacterAnimation();
      clearSelectionMotion();
      characterFrozen = false;
      hideCharacter();
    }

    function skipOpening() {
      cinematicCancelled = true;
      cancelCharacterAnimation();
      finishIntro({ immediate: true });
      characterFrozen = false;
      setOverviewState({ fitMap: true, animate: false });
    }

    function runOpeningAnimation() {
      cinematicCancelled = false;
      clearSelectionMotion();
      cancelCharacterAnimation();
      setOverviewState({ fitMap: true, animate: false });
      introTransitionVersion += 1;
      introRunning = true;
      intro.classList.remove("is-closing");
      intro.hidden = false;
      shell.classList.add("is-atlas-intro-playing");
      characterFrozen = true;
      if (reducedMotion) { skipOpening(); return; }
      later(() => {
        if (destroyed || cinematicCancelled || !introRunning) return;
        runCharacterFlyThrough().then(completed => {
          if (!completed || destroyed || cinematicCancelled || !introRunning) return;
          later(() => {
            if (destroyed || cinematicCancelled || !introRunning) return;
            setOverviewState();
            finishIntro();
          }, 360);
        });
      }, 780);
    }

    const revealActiveStory = () => {
      if (!popupCompact || !markers[activeIndex]?.isPopupOpen?.()) return false;
      if (map && map.getZoom() < 15) {
        select(activeIndex);
        return true;
      }
      openLocationPopup(activeIndex, { compact: false });
      return true;
    };
    on(previous, "click", () => { cancelAnimation(); if (activeIndex >= 0 && !revealActiveStory()) select(activeIndex - 1); });
    on(next, "click", () => { cancelAnimation(); if (!revealActiveStory()) select(activeIndex < 0 ? 0 : activeIndex + 1); });
    on(fit, "click", () => { cancelAnimation(); setOverviewState({ fitMap: true, animate: true }); });
    on(replay, "click", runOpeningAnimation);
    on(skipIntro, "click", skipOpening);
    map.on("move zoom", syncCharacter);
    on(shell, "keydown", event => {
      cancelAnimation();
      if (event.key === "ArrowLeft" && activeIndex >= 0) { event.preventDefault(); select(activeIndex - 1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); select(activeIndex < 0 ? 0 : activeIndex + 1); }
    });

    // Wait for the vector style to paint before sizing the map and starting the
    // entrance. This prevents the blank-map flash that iOS Safari can show.
    let startedMap = false;
    const onFirstTile = () => {
      if (startedMap || destroyed) return;
      startedMap = true;
      map.invalidateSize({ pan: false, animate: false });
      vectorMap.resize();
      const startExperience = () => {
        if (destroyed) return;
        if (cinematic && !reducedMotion && !cinematicCancelled) runOpeningAnimation();
        else { characterFrozen = false; setOverviewState({ fitMap: true, animate: false }); }
      };
      Promise.race([spriteReadyPromise, new Promise(resolve => later(resolve, 1000))]).then(startExperience);
    };
    vectorMap.once("idle", onFirstTile);
    // Fallback: keep the room usable when the network is slow or unavailable.
    later(() => { vectorMap.resize(); onFirstTile(); }, 2400);

    const dispose = () => {
      cancelAnimation();
      cancelCharacterAnimation();
      destroyed = true; timers.forEach(clearTimeout); timers.clear(); listeners.splice(0).forEach(remove => remove());
      if (tileLayer) tileLayer.off(); if (map) { map.off(); map.remove(); map = null; } host.replaceChildren();
    };
    dispose.resize = () => { if (!destroyed && map) { map.invalidateSize({ pan: false, animate: false }); later(syncCharacter, 0); } };
    return dispose;
  }

  root.StorybookAtlasRoom = { mount };
})(typeof globalThis !== "undefined" ? globalThis : window);
