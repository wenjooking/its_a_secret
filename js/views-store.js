/* Shared view counts — Supabase (all devices) → Node API → localStorage */
(function () {
  const STORAGE_KEY = "couple_festival_views";
  let supabase = null;

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveLocal(views) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  }

  async function loadConfig() {
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
  }

  function supabaseHeaders() {
    const key = supabase.apiKey;
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  }

  async function loadFromSupabase() {
    const res = await fetch(
      `${supabase.url}/rest/v1/festival_views?select=festival_id,view_count`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) throw new Error("supabase_load");

    const rows = await res.json();
    const views = {};
    rows.forEach((row) => {
      views[row.festival_id] = Number(row.view_count) || 0;
    });
    return views;
  }

  async function recordSupabase(id) {
    const res = await fetch(`${supabase.url}/rest/v1/rpc/increment_festival_view`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ fid: id }),
    });
    if (!res.ok) throw new Error("supabase_record");

    const views = await loadFromSupabase();
    saveLocal(views);
    return views[id] ?? 0;
  }

  async function loadFromApi() {
    const res = await fetch("/api/views");
    if (!res.ok) throw new Error("api_load");
    const data = await res.json();
    saveLocal(data);
    return data;
  }

  async function recordApi(id) {
    const res = await fetch(`/api/views/${encodeURIComponent(id)}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("api_record");
    const data = await res.json();
    saveLocal(data);
    return data[id] ?? 0;
  }

  async function loadFromFile() {
    const res = await fetch("data/views.json");
    if (!res.ok) throw new Error("file_load");
    return await res.json();
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.views = {
    backend: "local",

    async init() {
      supabase = await loadConfig();
    },

    async load() {
      if (supabase) {
        try {
          const views = await loadFromSupabase();
          this.backend = "supabase";
          saveLocal(views);
          return views;
        } catch {
          /* try next */
        }
      }

      try {
        const views = await loadFromApi();
        this.backend = "api";
        return views;
      } catch {
        /* static host */
      }

      try {
        const fileData = await loadFromFile();
        const merged = { ...fileData, ...loadLocal() };
        this.backend = "file";
        return merged;
      } catch {
        /* ignore */
      }

      this.backend = "local";
      return loadLocal();
    },

    async record(id) {
      if (supabase) {
        try {
          const count = await recordSupabase(id);
          this.backend = "supabase";
          return count;
        } catch {
          /* try next */
        }
      }

      try {
        const count = await recordApi(id);
        this.backend = "api";
        return count;
      } catch {
        /* fallback */
      }

      const views = loadLocal();
      views[id] = (views[id] || 0) + 1;
      saveLocal(views);
      this.backend = "local";
      return views[id];
    },
  };
})();
