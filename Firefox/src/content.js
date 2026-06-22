(function () {
  "use strict";

  const ROOT_ID = "cys-control-root";
  const BUTTON_ID = "cys-player-button";
  const MENU_ID = "cys-player-menu";
  const STORAGE_KEY = "cysSettings";
  const SPEEDS = Array.from({ length: 12 }, (_, index) => (index + 1) * 0.25);
  const ROTATIONS = [0, 90, 180, 270];

  let settings = {
    speed: 1,
    rotation: 0
  };

  let activeVideo = null;
  let syncTimer = null;
  let retryTimer = null;
  let bootRetries = 0;
  let eventsBound = false;
  let menuEventsBound = false;
  let isProgrammaticClick = false;

  const storage = typeof browser !== "undefined" && browser.storage
    ? browser.storage
    : typeof chrome !== "undefined" && chrome.storage
      ? chrome.storage
      : null;

  function readSettings() {
    if (!storage) {
      settings = readFallbackSettings();
      return Promise.resolve();
    }

    return storage.local.get(STORAGE_KEY).then((result) => {
      settings = normalizeSettings(result[STORAGE_KEY] || readFallbackSettings());
    }).catch(() => {
      settings = readFallbackSettings();
    });
  }

  function saveSettings() {
    settings = normalizeSettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (storage) {
      storage.local.set({ [STORAGE_KEY]: settings }).catch(() => {});
    }
  }

  function readFallbackSettings() {
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
    } catch (_error) {
      return { speed: 1, rotation: 0 };
    }
  }

  function normalizeSettings(value) {
    const speed = Number(value.speed);
    const rotation = Number(value.rotation);

    return {
      speed: Number.isFinite(speed) ? clamp(roundSpeed(speed), 0.05, 16) : 1,
      rotation: ROTATIONS.includes(rotation) ? rotation : 0
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundSpeed(value) {
    return Math.round(value * 100) / 100;
  }

  function formatSpeed(value) {
    return value % 1 === 0 ? value.toFixed(1) : Number(value.toFixed(2)).toString();
  }

  function formatPresetSpeed(value) {
    const label = value % 1 === 0 ? value.toFixed(1) : Number(value.toFixed(2)).toString();
    return `${label}x`;
  }

  function getPlayer() {
    return document.querySelector(".html5-video-player");
  }

  function getVideo() {
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
  }

  function getRightControls() {
    return document.querySelector(".ytp-right-controls");
  }

  function getSubtitleButton() {
    return document.querySelector(".ytp-subtitles-button");
  }

  function getSettingsButton() {
    return document.querySelector(".ytp-settings-button");
  }

  function applySettings() {
    const video = getVideo();
    if (!video) return;

    if (activeVideo !== video) {
      if (activeVideo) {
        activeVideo.removeEventListener("loadedmetadata", applySettings);
        activeVideo.removeEventListener("ratechange", keepSelectedSpeed);
      }

      activeVideo = video;
      activeVideo.addEventListener("loadedmetadata", applySettings);
      activeVideo.addEventListener("ratechange", keepSelectedSpeed);
    }

    if (video.playbackRate !== settings.speed) {
      video.playbackRate = settings.speed;
    }

    applyRotation(video);
    updateButtonLabel();
    updateMenuState();
  }

  function keepSelectedSpeed() {
    if (!activeVideo) return;

    if (Math.abs(activeVideo.playbackRate - settings.speed) > 0.001) {
      window.setTimeout(() => {
        if (activeVideo && Math.abs(activeVideo.playbackRate - settings.speed) > 0.001) {
          activeVideo.playbackRate = settings.speed;
        }
      }, 0);
    }
  }

  function applyRotation(video) {
    const angle = settings.rotation;
    const scale = angle === 90 || angle === 270 ? getRotationScale(video) : 1;

    video.style.setProperty("--cys-rotation-scale", scale.toString());
    video.style.transform = `rotate(${angle}deg) scale(${scale})`;
    video.style.transformOrigin = "center center";
    video.style.transition = "transform 160ms ease";
  }

  function getRotationScale(video) {
    const player = getPlayer();
    const bounds = player ? player.getBoundingClientRect() : video.getBoundingClientRect();
    const width = bounds.width || video.clientWidth || 16;
    const height = bounds.height || video.clientHeight || 9;

    return clamp(Math.min(width / height, height / width), 0.25, 1);
  }

  function ensureControl() {
    const controls = getRightControls();

    if (!controls) return;
    ensureSpeedControl(controls);
  }

  function ensureSpeedControl(controls) {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("span");
    root.id = ROOT_ID;
    root.className = "ytp-button cys-root";

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "cys-button";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.title = "Playback speed and rotation";
    button.innerHTML = `
      <svg class="cys-button-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" aria-hidden="true">
        <polygon points="8.25 3.75,8.25 12.25,14.25 8"/>
        <polygon points="1.75 3.75,1.75 12.25,7.75 8"/>
      </svg>
      <span class="cys-button-speed">1.0</span>
    `;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });

    root.appendChild(button);
    placeControl(root, controls);

    ensureMenu();
    updateButtonLabel();
  }

  function placeControl(root, controls) {
    const subtitleButton = getSubtitleButton();
    const settingsButton = getSettingsButton();
    const referenceButton = subtitleButton || settingsButton || controls.firstElementChild;

    if (referenceButton && referenceButton.parentElement === controls) {
      controls.insertBefore(root, referenceButton);
      return;
    }

    if (subtitleButton) {
      subtitleButton.insertAdjacentElement("beforebegin", root);
      return;
    }

    controls.insertBefore(root, controls.firstChild);
  }

  function ensureMenu() {
    if (document.getElementById(MENU_ID)) return;

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.className = "cys-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Playback speed and rotation");

    const speedSection = document.createElement("section");
    speedSection.className = "cys-section";

    const speedTitle = document.createElement("div");
    speedTitle.className = "cys-section-title";
    speedTitle.textContent = "Playback speed";

    const speedGrid = document.createElement("div");
    speedGrid.className = "cys-speed-grid";

    SPEEDS.forEach((speed) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cys-menu-item";
      item.dataset.speed = speed.toString();
      item.textContent = formatPresetSpeed(speed);
      item.addEventListener("click", () => setSpeed(speed));
      speedGrid.appendChild(item);
    });

    const customRow = document.createElement("form");
    customRow.className = "cys-custom-row";
    customRow.innerHTML = `
      <span class="cys-custom-label">Custom</span>
      <input class="cys-speed-input" type="number" min="0.05" max="16" step="0.05" aria-label="Custom speed">
      <button class="cys-apply-button" type="submit">Set</button>
    `;

    customRow.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = customRow.querySelector(".cys-speed-input");
      const value = Number(input.value);
      if (Number.isFinite(value)) {
        setSpeed(value);
      }
    });

    const speedInput = customRow.querySelector(".cys-speed-input");
    ["keydown", "keyup", "keypress"].forEach((eventName) => {
      speedInput.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    speedSection.append(speedTitle, speedGrid, customRow);

    const rotationSection = document.createElement("section");
    rotationSection.className = "cys-section";

    const rotationTitle = document.createElement("div");
    rotationTitle.className = "cys-section-title";
    rotationTitle.textContent = "Rotation";

    const rotationGrid = document.createElement("div");
    rotationGrid.className = "cys-rotation-grid";

    ROTATIONS.forEach((rotation) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cys-rotate-item";
      item.dataset.rotation = rotation.toString();
      item.textContent = `${rotation}°`;
      item.addEventListener("click", () => setRotation(rotation));
      rotationGrid.appendChild(item);
    });

    rotationSection.append(rotationTitle, rotationGrid);

    menu.append(speedSection, rotationSection);
    root.appendChild(menu);

    if (!menuEventsBound) {
      menuEventsBound = true;
      document.addEventListener("click", closeMenuFromOutside, true);
      document.addEventListener("keydown", closeMenuWithEscape, true);

      const settingsBtn = getSettingsButton();
      if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
          if (!isProgrammaticClick) {
            closeMenu();
          }
        });
      }
    }

    updateMenuState();
  }

  function setSpeed(value) {
    settings.speed = clamp(roundSpeed(Number(value)), 0.05, 16);
    saveSettings();
    syncPlayer();
  }

  function setRotation(value) {
    settings.rotation = value;
    saveSettings();
    syncPlayer();
  }

  function toggleMenu() {
    const menu = document.getElementById(MENU_ID);
    const button = document.getElementById(BUTTON_ID);
    if (!menu || !button) return;

    const isOpen = menu.classList.toggle("cys-menu-open");
    button.setAttribute("aria-expanded", isOpen.toString());
    updateMenuState();

    if (isOpen) {
      closeYouTubeSettingsMenu();
      updateMenuPlacement();
      menu.querySelector(".cys-speed-input")?.focus({ preventScroll: true });
    }
  }

  function closeYouTubeSettingsMenu() {
    const player = getPlayer();
    if (!player) return;

    const settingsMenu = player.querySelector(".ytp-settings-menu");
    if (settingsMenu && settingsMenu.style.display !== "none") {
      const settingsBtn = getSettingsButton();
      if (settingsBtn) {
        isProgrammaticClick = true;
        settingsBtn.click();
        isProgrammaticClick = false;
      }
    }
  }

  function closeMenu() {
    const menu = document.getElementById(MENU_ID);
    const button = document.getElementById(BUTTON_ID);

    menu?.classList.remove("cys-menu-open");
    button?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cys-menu-active");
  }

  function closeMenuFromOutside(event) {
    if (isProgrammaticClick) return;

    const menu = document.getElementById(MENU_ID);
    const root = document.getElementById(ROOT_ID);

    if (!menu || !menu.classList.contains("cys-menu-open")) return;
    if (menu.contains(event.target) || root?.contains(event.target)) return;

    closeMenu();
  }

  function closeMenuWithEscape(event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  }

  function updateButtonLabel() {
    const label = document.querySelector(".cys-button-speed");
    if (label) {
      label.textContent = formatSpeed(settings.speed);
    }
  }

  function updateMenuState() {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;

    document.body.classList.toggle("cys-menu-active", menu.classList.contains("cys-menu-open"));

    menu.querySelectorAll("[data-speed]").forEach((item) => {
      item.classList.toggle("cys-active", Number(item.dataset.speed) === settings.speed);
    });

    menu.querySelectorAll("[data-rotation]").forEach((item) => {
      item.classList.toggle("cys-active", Number(item.dataset.rotation) === settings.rotation);
    });

    const input = menu.querySelector(".cys-speed-input");
    if (input && document.activeElement !== input) {
      input.value = settings.speed.toString();
    }
  }

  function updateMenuPlacement() {
    const root = document.getElementById(ROOT_ID);
    const menu = document.getElementById(MENU_ID);
    if (!root || !menu || !menu.classList.contains("cys-menu-open")) return;

    const rootBounds = root.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 280;
    const gap = 8;
    const centeredLeft = rootBounds.left + rootBounds.width / 2 - menuWidth / 2;
    const overflowLeft = Math.max(gap - centeredLeft, 0);
    const overflowRight = Math.max(centeredLeft + menuWidth - (window.innerWidth - gap), 0);

    menu.style.setProperty("--cys-menu-shift", `${overflowLeft - overflowRight}px`);
  }

  function syncPlayer() {
    cleanupRemovedControlsFeature();
    ensureControl();
    ensureMenu();
    applySettings();
    updateMenuPlacement();
  }

  function cleanupRemovedControlsFeature() {
    document.documentElement.classList.remove("cys-controls-outside-page");
    getPlayer()?.classList.remove("cys-controls-outside");
    document.getElementById("cys-dock-root")?.remove();

    const parent = document.getElementById("cys-playerbar-parent");
    const playerBar = parent?.querySelector(".ytp-chrome-bottom");
    const player = getPlayer();

    if (parent && playerBar && player) {
      player.appendChild(playerBar);
    }

    parent?.remove();
  }

  function scheduleSync(delay = 100) {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncPlayer, delay);
  }

  function startShortRetry() {
    window.clearInterval(retryTimer);
    bootRetries = 0;

    retryTimer = window.setInterval(() => {
      syncPlayer();
      bootRetries += 1;

      if ((document.getElementById(ROOT_ID) && getVideo()) || bootRetries >= 40) {
        window.clearInterval(retryTimer);
        retryTimer = null;
      }
    }, 250);
  }

  function bindEvents() {
    if (eventsBound) return;

    eventsBound = true;
    window.addEventListener("resize", () => scheduleSync(120));
    document.addEventListener("fullscreenchange", () => scheduleSync(120));

    document.addEventListener("yt-navigate-finish", () => {
      closeMenu();
      startShortRetry();
    });

    document.addEventListener("yt-page-data-updated", () => {
      startShortRetry();
    });
  }

  function boot() {
    bindEvents();
    syncPlayer();

    if (!document.getElementById(ROOT_ID) || !getVideo()) {
      startShortRetry();
    }
  }

  readSettings().then(boot);
})();
