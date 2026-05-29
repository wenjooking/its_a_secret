/* Shared Supabase client — config, app_state JSON store, image storage.
   Used by notes-store and manifest-store so user-created content survives
   redeploys (instead of living on the server's ephemeral disk). */
(function () {
  let configPromise = null;

  function loadConfig() {
    if (configPromise) return configPromise;
    configPromise = (async () => {
      try {
        const res = await fetch("config/supabase.json");
        if (!res.ok) return null;
        const cfg = await res.json();
        const apiKey = cfg.publishableKey || cfg.anonKey;
        if (!cfg.url || !apiKey) return null;
        return { url: cfg.url.replace(/\/$/, ""), apiKey };
      } catch {
        return null;
      }
    })();
    return configPromise;
  }

  function headers(cfg, extra) {
    return {
      apikey: cfg.apiKey,
      Authorization: `Bearer ${cfg.apiKey}`,
      ...extra,
    };
  }

  // Read a JSON document stored in public.app_state under `key`.
  async function getState(key) {
    const cfg = await loadConfig();
    if (!cfg) return { ok: false };
    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`,
        { headers: headers(cfg, { "Content-Type": "application/json" }) }
      );
      if (!res.ok) return { ok: false };
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: true, found: false, value: null };
      }
      return { ok: true, found: true, value: rows[0].value };
    } catch {
      return { ok: false };
    }
  }

  // Upsert a JSON document into public.app_state under `key`.
  async function setState(key, value) {
    const cfg = await loadConfig();
    if (!cfg) return { ok: false };
    try {
      const res = await fetch(`${cfg.url}/rest/v1/app_state?on_conflict=key`, {
        method: "POST",
        headers: headers(cfg, {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify([
          { key, value, updated_at: new Date().toISOString() },
        ]),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  }

  function extFromMime(mime) {
    switch (mime) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/gif":
        return "gif";
      default:
        return null;
    }
  }

  // Upload a base64 data URL to the public `note-images` bucket.
  // Returns the public URL on success.
  async function uploadImage(baseName, dataUrl) {
    const cfg = await loadConfig();
    if (!cfg) return { ok: false };

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
      dataUrl || ""
    );
    if (!match) return { ok: false, error: "Unsupported image data." };

    const ext = extFromMime(match[1]);
    if (!ext) return { ok: false, error: "Use a JPEG, PNG, WebP, or GIF." };

    let bytes;
    try {
      bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    } catch {
      return { ok: false, error: "Invalid image data." };
    }

    const filename = `${baseName}.${ext}`;
    try {
      const res = await fetch(
        `${cfg.url}/storage/v1/object/note-images/${encodeURIComponent(filename)}`,
        {
          method: "POST",
          headers: headers(cfg, {
            "Content-Type": match[1],
            "x-upsert": "true",
          }),
          body: bytes,
        }
      );
      if (!res.ok) return { ok: false, error: "Could not upload image." };
      return {
        ok: true,
        url: `${cfg.url}/storage/v1/object/public/note-images/${encodeURIComponent(filename)}`,
      };
    } catch {
      return { ok: false };
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.supabase = { loadConfig, getState, setState, uploadImage };
})();
