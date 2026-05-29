/* Load / save festivals manifest — API (npm start) or localStorage fallback */
(function () {
  const OVERRIDE_KEY = "couple_manifest_override";

  function normalizeManifest(data) {
    const festivals = Array.isArray(data.festivals) ? data.festivals : [];
    const timeline = Array.isArray(data.timeline) ? data.timeline : [...festivals];
    return { ...data, festivals, timeline };
  }

  function supabase() {
    return window.CoupleApp?.supabase || null;
  }

  async function loadFromFile() {
    const res = await fetch("festivals/manifest.json");
    if (!res.ok) throw new Error("manifest");
    return normalizeManifest(await res.json());
  }

  async function load() {
    // 1. Supabase (survives redeploys, syncs across devices)
    const sb = supabase();
    if (sb && (await sb.loadConfig())) {
      const state = await sb.getState("manifest");
      if (state.ok && state.found && state.value) {
        localStorage.removeItem(OVERRIDE_KEY);
        return normalizeManifest(state.value);
      }
      // No manifest row yet — seed it from the committed file.
      if (state.ok && !state.found) {
        const seed = await loadFromFile();
        await sb.setState("manifest", seed);
        return seed;
      }
    }

    // 2. Node API (npm start / local dev)
    try {
      const res = await fetch("/api/manifest");
      if (res.ok) {
        localStorage.removeItem(OVERRIDE_KEY);
        return normalizeManifest(await res.json());
      }
    } catch {
      /* static or offline */
    }

    try {
      const cached = localStorage.getItem(OVERRIDE_KEY);
      if (cached) return normalizeManifest(JSON.parse(cached));
    } catch {
      /* ignore */
    }

    // 3. Static file fallback
    return loadFromFile();
  }

  async function save(data) {
    const sb = supabase();
    if (sb && (await sb.loadConfig())) {
      const normalized = normalizeManifest(data);
      const r = await sb.setState("manifest", normalized);
      if (r.ok) {
        localStorage.removeItem(OVERRIDE_KEY);
        return { ok: true, persisted: "supabase", manifest: normalized };
      }
    }

    try {
      const res = await fetch("/api/manifest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data, null, 2),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        localStorage.removeItem(OVERRIDE_KEY);
        const manifest = body.manifest
          ? normalizeManifest(body.manifest)
          : normalizeManifest(data);
        return { ok: true, persisted: "server", manifest };
      }
      return { ok: false, error: body.error || "Could not save." };
    } catch {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
      return {
        ok: true,
        persisted: "local",
        manifest: data,
        message: "Saved on this device only (run npm start to update the file).",
      };
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.manifestStore = { load, save };
})();
