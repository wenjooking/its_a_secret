/* Load / save festivals manifest — API (npm start) or localStorage fallback */
(function () {
  const OVERRIDE_KEY = "couple_manifest_override";

  function normalizeManifest(data) {
    const festivals = Array.isArray(data.festivals) ? data.festivals : [];
    const timeline = Array.isArray(data.timeline) ? data.timeline : [...festivals];
    return { ...data, festivals, timeline };
  }

  async function load() {
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

    const res = await fetch("festivals/manifest.json");
    if (!res.ok) throw new Error("manifest");
    return normalizeManifest(await res.json());
  }

  async function save(data) {
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
