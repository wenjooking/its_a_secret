/* Site-wide login gate (sessionStorage). Skip on login.html */
(function () {
  const STORAGE_KEY = "couple_auth";
  const NAME_KEY = "couple_user_name";
  const LOGIN_FILE = "login.html";
  const PASSCODE_LENGTH = 8;

  const path = window.location.pathname;
  const isLoginPage =
    path.endsWith("/login.html") || path.endsWith("login.html");

  function isAuthed() {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  }

  function loginPath() {
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    return `${dir}${LOGIN_FILE}`;
  }

  function redirectToLogin() {
    const next = encodeURIComponent(path + window.location.search);
    window.location.replace(`${loginPath()}?next=${next}`);
  }

  if (!isLoginPage && !isAuthed()) {
    redirectToLogin();
    return;
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function verifyPassword(password) {
    const res = await fetch("config/auth.json");
    if (!res.ok) return false;
    const { passwordHash } = await res.json();
    const hash = await hashPassword(password);
    return hash === passwordHash;
  }

  const PROFILE_NAMES = {
    jolin: "Jolin",
    wenjoo: "Wen Joo",
  };

  function formatDisplayName(name) {
    const key = name.trim().toLowerCase();
    if (PROFILE_NAMES[key]) return PROFILE_NAMES[key];
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  function signIn(name) {
    const displayName = formatDisplayName(name || "");
    sessionStorage.setItem(STORAGE_KEY, "1");
    if (displayName) {
      sessionStorage.setItem(NAME_KEY, displayName);
    }
  }

  function getDisplayName() {
    return sessionStorage.getItem(NAME_KEY) || "";
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(NAME_KEY);
    window.location.replace(loginPath());
  }

  function isValidPasscode(code) {
    return typeof code === "string" && /^\d{8}$/.test(code);
  }

  async function changePasscode(currentPasscode, newPasscode) {
    try {
      const res = await fetch("/api/auth/change-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPasscode, newPasscode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true };
      return {
        ok: false,
        error: data.error || "Could not update passcode.",
      };
    } catch {
      return {
        ok: false,
        error:
          "Passcode change needs the Node server — run npm start (not static hosting alone).",
      };
    }
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.auth = {
    isAuthed,
    verifyPassword,
    signIn,
    signOut,
    getDisplayName,
    hashPassword,
    isValidPasscode,
    changePasscode,
    PASSCODE_LENGTH,
  };
})();
