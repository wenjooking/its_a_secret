/* Push-pin decoration on notes — built-in SVG + optional PNGs in assets/pins/ */
(function () {
  const BUILTIN_PINS = [
    {
      id: "red",
      head: "#c73e3e",
      highlight: "rgba(255,255,255,0.4)",
    },
    {
      id: "gold",
      head: "#d4a017",
      highlight: "rgba(255,255,255,0.45)",
    },
    {
      id: "blue",
      head: "#3d6eb5",
      highlight: "rgba(255,255,255,0.38)",
    },
    {
      id: "pink",
      head: "#e85a8a",
      highlight: "rgba(255,255,255,0.42)",
    },
    {
      id: "green",
      head: "#3d9a62",
      highlight: "rgba(255,255,255,0.38)",
    },
    {
      id: "silver",
      head: "#9aa3ad",
      highlight: "rgba(255,255,255,0.55)",
    },
  ];

  const builtinIds = new Set(BUILTIN_PINS.map((p) => p.id));
  let customPinSrcs = [];

  function pinSvgMarkup(pin) {
    const { head, highlight } = pin;
    return `<svg class="note-card__pin-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" aria-hidden="true">
      <ellipse cx="16" cy="37" rx="7" ry="2.2" fill="rgba(0,0,0,0.14)"/>
      <path d="M16 20v17" stroke="#6b6b6b" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="16" cy="13" r="11" fill="${head}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6"/>
      <circle cx="11.5" cy="9" r="3.2" fill="${highlight}"/>
    </svg>`;
  }

  function hashSlot(note, index, count) {
    let h = 0;
    const id = note.id || "";
    for (let i = 0; i < id.length; i += 1) {
      h = (h * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(h + index * 11) % Math.max(1, count);
  }

  function allPinOptions() {
    const custom = customPinSrcs.map((src, i) => ({
      id: `file-${i}`,
      type: "image",
      src,
    }));
    const builtin = BUILTIN_PINS.map((p) => ({
      id: p.id,
      type: "svg",
      pin: p,
    }));
    return [...custom, ...builtin];
  }

  function pickPinOption(note, index = 0) {
    const options = allPinOptions();
    if (!options.length) return null;

    if (note.pin) {
      const match = options.find((o) => o.id === note.pin);
      if (match) return match;
      if (builtinIds.has(note.pin)) {
        const pin = BUILTIN_PINS.find((p) => p.id === note.pin);
        if (pin) return { id: pin.id, type: "svg", pin };
      }
    }

    return options[hashSlot(note, index, options.length)];
  }

  function pinTiltDeg(note, index = 0) {
    return ((hashSlot(note, index, 17) % 17) - 8) * 1.1;
  }

  function createPinElement(note, index = 0) {
    const option = pickPinOption(note, index);
    if (!option) return null;

    const wrap = document.createElement("div");
    wrap.className = "note-card__pin";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.setProperty("--pin-tilt", `${pinTiltDeg(note, index)}deg`);

    if (option.type === "image") {
      const img = document.createElement("img");
      img.className = "note-card__pin-img";
      img.src = option.src;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      wrap.appendChild(img);
    } else {
      wrap.innerHTML = pinSvgMarkup(option.pin);
    }

    return wrap;
  }

  async function loadCustomPins() {
    try {
      const res = await fetch("assets/pins/manifest.json");
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.pins)) return;
      customPinSrcs = data.pins
        .map((name) => String(name || "").trim())
        .filter((name) => /^[a-zA-Z0-9_.-]+$/.test(name))
        .map((name) => `assets/pins/${name}`);
    } catch {
      /* no custom pins */
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.notePins = {
    BUILTIN_PINS,
    builtinIds,
    loadCustomPins,
    pickPinOption,
    createPinElement,
    pinTiltDeg,
  };
})();
