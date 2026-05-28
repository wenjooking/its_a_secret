/* Last-seen — festivals (per id) and notes (per note id, per signed-in user) */
(function () {
  const STORAGE_KEY = "couple_festival_seen";
  const NOTES_SEEN_IDS_PREFIX = "couple_notes_seen_ids_";
  const NOTES_SEEN_BOOTSTRAP_PREFIX = "couple_notes_seen_bootstrapped_";
  const NOTES_SKIP_BOOTSTRAP_PREFIX = "couple_notes_seen_skip_bootstrap_";
  const NOTES_SEEN_LEGACY_KEY = "couple_notes_last_seen";
  const NOTES_SEEN_LEGACY_IDS = "couple_notes_seen_ids";

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function userSuffix() {
    const name = window.CoupleApp?.auth?.getDisplayName?.() || "";
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    return slug || "guest";
  }

  function userKeys() {
    const suffix = userSuffix();
    return {
      ids: `${NOTES_SEEN_IDS_PREFIX}${suffix}`,
      bootstrap: `${NOTES_SEEN_BOOTSTRAP_PREFIX}${suffix}`,
      skipBootstrap: `${NOTES_SKIP_BOOTSTRAP_PREFIX}${suffix}`,
    };
  }

  function loadSeenNoteIds() {
    const keys = userKeys();
    try {
      migrateLegacySeenIds(keys.ids);
      const raw = localStorage.getItem(keys.ids);
      const list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  }

  function saveSeenNoteIds(ids) {
    try {
      localStorage.setItem(userKeys().ids, JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
  }

  function migrateLegacySeenIds(userIdsKey) {
    try {
      if (localStorage.getItem(userIdsKey)) return;
      const legacy = localStorage.getItem(NOTES_SEEN_LEGACY_IDS);
      if (!legacy) return;
      localStorage.setItem(userIdsKey, legacy);
    } catch {
      /* ignore */
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.seen = {
    get(id) {
      return loadAll()[id] || null;
    },

    mark(id, updatedAt) {
      if (!id || !updatedAt) return;
      const data = loadAll();
      data[id] = updatedAt;
      saveAll(data);
    },

    isNew(festival) {
      if (!festival?.updatedAt || festival.status !== "ready") return false;
      const seen = this.get(festival.id);
      return !seen || seen < festival.updatedAt;
    },
  };

  window.CoupleApp.notesSeen = {
    loadIds: loadSeenNoteIds,

    bootstrapExisting(notes) {
      if (!Array.isArray(notes)) return;
      const keys = userKeys();
      try {
        if (localStorage.getItem(keys.skipBootstrap)) {
          localStorage.removeItem(keys.skipBootstrap);
          localStorage.setItem(keys.bootstrap, "1");
          this.pruneIds(notes);
          return;
        }
        if (localStorage.getItem(keys.bootstrap)) {
          this.pruneIds(notes);
          return;
        }
        const mine = (window.CoupleApp?.auth?.getDisplayName?.() || "").trim();
        const ids = new Set();
        notes.forEach((n) => {
          if (!n?.id) return;
          if (mine && (n.author || "").trim() === mine) {
            ids.add(n.id);
          }
        });
        saveSeenNoteIds(ids);
        localStorage.setItem(keys.bootstrap, "1");
        localStorage.removeItem(NOTES_SEEN_LEGACY_KEY);
      } catch {
        /* ignore */
      }
    },

    pruneIds(notes) {
      const valid = new Set(notes.map((n) => n.id).filter(Boolean));
      const ids = loadSeenNoteIds();
      let changed = false;
      ids.forEach((id) => {
        if (!valid.has(id)) {
          ids.delete(id);
          changed = true;
        }
      });
      if (changed) saveSeenNoteIds(ids);
    },

    isUnread(note) {
      if (!note?.id) return false;
      const mine = window.CoupleApp?.auth?.getDisplayName?.() || "";
      const author = (note.author || "").trim();
      if (mine && author && author === mine) return false;
      return !loadSeenNoteIds().has(note.id);
    },

    markRead(noteId) {
      if (!noteId) return;
      const ids = loadSeenNoteIds();
      ids.add(noteId);
      saveSeenNoteIds(ids);
    },

    clear({ fromReset } = {}) {
      const keys = userKeys();
      try {
        localStorage.removeItem(keys.ids);
        localStorage.removeItem(keys.bootstrap);
        if (fromReset) {
          localStorage.setItem(keys.skipBootstrap, "1");
        }
      } catch {
        /* ignore */
      }
    },
  };
})();
