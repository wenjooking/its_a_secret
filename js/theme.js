/* Light / dark theme — persists in localStorage */
(function () {
  const STORAGE_KEY = "couple-theme";
  const META_LIGHT = "#f6f4fa";
  const META_DARK = "#0a0a0f";

  let festivalTheme = null;

  function getStored() {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  }

  function getPreferred() {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function updateMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    if (getTheme() === "light") {
      meta.setAttribute("content", META_LIGHT);
      return;
    }

    meta.setAttribute(
      "content",
      festivalTheme?.themeColor || festivalTheme?.background || META_DARK
    );
  }

  function updateToggle(btn) {
    if (!btn) return;
    const isDark = getTheme() === "dark";

    btn.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.body.style.background = "";
    updateMeta();
    updateToggle(document.getElementById("themeToggle"));
  }

  function toggle() {
    apply(getTheme() === "dark" ? "light" : "dark");
  }

  function applyFestival(theme) {
    festivalTheme = theme;
    const root = document.documentElement;
    const accent = theme.accent || theme.heartColor;

    root.style.setProperty("--theme-heart", theme.heartColor);
    root.style.setProperty("--theme-accent", accent);
    root.style.setProperty("--festival-bg", theme.background);
    root.style.setProperty("--theme-glow", theme.glow || `${accent}33`);
    updateMeta();
  }

  function initToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    if (!btn.dataset.ready) {
      btn.addEventListener("click", toggle);
      btn.dataset.ready = "true";
    }

    updateToggle(btn);
  }

  /* Apply theme before paint when possible */
  document.documentElement.setAttribute(
    "data-theme",
    getStored() || getPreferred()
  );

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.theme = {
    get: getTheme,
    toggle,
    apply,
    applyFestival,
  };

  function boot() {
    apply(getStored() || getPreferred());
    initToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
