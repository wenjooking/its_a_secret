/* Site-wide login gate (sessionStorage). Skip on login.html */
(function () {
  const STORAGE_KEY = "couple_auth";
  const LOGIN_FILE = "login.html";

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

  function signIn() {
    sessionStorage.setItem(STORAGE_KEY, "1");
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.replace(loginPath());
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.auth = {
    isAuthed,
    verifyPassword,
    signIn,
    signOut,
    hashPassword,
  };
})();
