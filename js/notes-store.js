/* Load / save surprise notes — API (npm start) or localStorage fallback */
(function () {
  const OVERRIDE_KEY = "couple_notes_override";

  function readCache() {
    try {
      const cached = localStorage.getItem(OVERRIDE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached);
      return Array.isArray(data.notes) ? data.notes : null;
    } catch {
      return null;
    }
  }

  function writeCache(notes) {
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ notes }));
    } catch {
      /* ignore quota */
    }
  }

  function hasLayout(note) {
    return (
      note &&
      typeof note.x === "number" &&
      typeof note.y === "number" &&
      Number.isFinite(note.x) &&
      Number.isFinite(note.y)
    );
  }

  function mergeNoteLayout(serverNote, cachedNote) {
    if (!cachedNote || hasLayout(serverNote)) return serverNote;
    if (!hasLayout(cachedNote)) return serverNote;
    const merged = { ...serverNote, x: cachedNote.x, y: cachedNote.y };
    if (typeof cachedNote.rotation === "number") {
      merged.rotation = cachedNote.rotation;
    }
    if (cachedNote.pin) merged.pin = cachedNote.pin;
    return merged;
  }

  function mergeNotesLists(serverNotes, cachedNotes) {
    if (!Array.isArray(serverNotes)) return cachedNotes || [];
    if (!Array.isArray(cachedNotes)) return serverNotes;
    const cacheById = Object.fromEntries(cachedNotes.map((n) => [n.id, n]));
    return serverNotes.map((n) => mergeNoteLayout(n, cacheById[n.id]));
  }

  function needsLayoutSync(serverNotes, mergedNotes) {
    if (!Array.isArray(serverNotes) || !Array.isArray(mergedNotes)) return false;
    const serverById = Object.fromEntries(serverNotes.map((n) => [n.id, n]));
    return mergedNotes.some((n) => {
      const serverNote = serverById[n.id];
      return hasLayout(n) && !hasLayout(serverNote);
    });
  }

  function supabase() {
    return window.CoupleApp?.supabase || null;
  }

  async function load() {
    const cached = readCache();

    // 1. Supabase (survives redeploys, syncs across devices)
    const sb = supabase();
    if (sb && (await sb.loadConfig())) {
      const state = await sb.getState("notes");
      if (state.ok && state.found && Array.isArray(state.value)) {
        const merged = mergeNotesLists(state.value, cached);
        writeCache(merged);
        return {
          notes: merged,
          syncLayoutToServer: needsLayoutSync(state.value, merged),
        };
      }
      // No notes row yet — seed it from the committed file/API below so
      // existing notes are preserved into Supabase on first run.
      if (state.ok && !state.found) {
        const seed = await loadSeedNotes(cached);
        if (seed.notes.length) {
          await sb.setState("notes", seed.notes);
        }
        return { notes: seed.notes, syncLayoutToServer: false };
      }
    }

    // 2. Node API (npm start / local dev)
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        const serverNotes = Array.isArray(data.notes) ? data.notes : [];
        const merged = mergeNotesLists(serverNotes, cached);
        writeCache(merged);
        return {
          notes: merged,
          syncLayoutToServer: needsLayoutSync(serverNotes, merged),
        };
      }
    } catch {
      /* static or offline */
    }

    if (cached) {
      return { notes: cached, syncLayoutToServer: false };
    }

    // 3. Static file fallback
    try {
      const res = await fetch("data/notes.json");
      if (res.ok) {
        const data = await res.json();
        const fileNotes = Array.isArray(data.notes) ? data.notes : [];
        const merged = mergeNotesLists(fileNotes, cached);
        writeCache(merged);
        return { notes: merged, syncLayoutToServer: false };
      }
    } catch {
      /* ignore */
    }

    return { notes: [], syncLayoutToServer: false };
  }

  async function loadSeedNotes(cached) {
    try {
      const res = await fetch("data/notes.json");
      if (res.ok) {
        const data = await res.json();
        const fileNotes = Array.isArray(data.notes) ? data.notes : [];
        const merged = mergeNotesLists(fileNotes, cached);
        writeCache(merged);
        return { notes: merged };
      }
    } catch {
      /* ignore */
    }
    return { notes: cached || [] };
  }

  async function save(notes) {
    const payload = { notes };
    writeCache(notes);

    const sb = supabase();
    if (sb && (await sb.loadConfig())) {
      const r = await sb.setState("notes", notes);
      if (r.ok) {
        writeCache(notes);
        return { ok: true, persisted: "supabase", notes };
      }
    }

    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload, null, 2),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const saved = Array.isArray(body.notes) ? body.notes : notes;
        writeCache(saved);
        return {
          ok: true,
          persisted: "server",
          notes: saved,
        };
      }
      return { ok: false, error: body.error || "Could not save." };
    } catch {
      return {
        ok: true,
        persisted: "local",
        notes,
        message: "Saved on this device only (run npm start to update the file).",
      };
    }
  }

  async function uploadImage(noteId, dataUrl) {
    const sb = supabase();
    if (sb && (await sb.loadConfig())) {
      const r = await sb.uploadImage(noteId, dataUrl);
      if (r.ok) return { ok: true, image: r.url };
      if (r.error) return { ok: false, error: r.error };
      /* fall through to Node API if Supabase upload failed unexpectedly */
    }

    try {
      const res = await fetch("/api/notes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.image) {
        return { ok: true, image: body.image };
      }
      return { ok: false, error: body.error || "Could not upload image." };
    } catch {
      return {
        ok: false,
        error:
          "Image upload needs Supabase (set config/supabase.json) or the Node server (npm start).",
      };
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.notesStore = { load, save, uploadImage, hasLayout };
})();
