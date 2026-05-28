/* Last-seen content version per festival (localStorage) */
(function () {
  const STORAGE_KEY = "couple_festival_seen";

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
})();
