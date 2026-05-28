(function () {
  const PASSCODE_LENGTH = 8;
  const display = document.getElementById("passcodeDisplay");
  const valueEl = document.getElementById("passcodeValue");
  const numpad = document.getElementById("numpad");
  const errorEl = document.getElementById("loginError");
  const card = document.querySelector(".login-card");

  let digits = [];
  let verifying = false;

  function getNextUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("next");
    if (!raw) return "index.html";

    try {
      const next = decodeURIComponent(raw);
      const url = new URL(next, window.location.origin);
      if (url.origin !== window.location.origin) return "index.html";
      if (url.pathname.endsWith("login.html")) return "index.html";
      return url.pathname + url.search;
    } catch {
      return "index.html";
    }
  }

  function updateDisplay() {
    valueEl.replaceChildren();

    for (let i = 0; i < PASSCODE_LENGTH; i++) {
      const char = document.createElement("span");
      char.className =
        i < digits.length
          ? "passcode-char passcode-char--filled"
          : "passcode-char passcode-char--empty";
      char.textContent = "*";
      valueEl.appendChild(char);
    }

    display.classList.toggle("passcode-display--typing", digits.length > 0);
  }

  function clearError() {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
    card.classList.remove("login-card--shake");
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    card.classList.add("login-card--shake");
    digits = [];
    updateDisplay();
  }

  function addDigit(d) {
    if (verifying || digits.length >= PASSCODE_LENGTH) return;
    clearError();
    digits.push(d);
    updateDisplay();

    if (digits.length === PASSCODE_LENGTH) {
      submitPasscode();
    }
  }

  function removeDigit() {
    if (verifying || digits.length === 0) return;
    clearError();
    digits.pop();
    updateDisplay();
  }

  function clearPasscode() {
    if (verifying) return;
    clearError();
    digits = [];
    updateDisplay();
  }

  async function submitPasscode() {
    verifying = true;
    const code = digits.join("");

    const ok = await window.CoupleApp.auth.verifyPassword(code);
    if (!ok) {
      verifying = false;
      showError("Wrong passcode. Try again.");
      return;
    }

    window.CoupleApp.auth.signIn();
    window.location.replace(getNextUrl());
  }

  if (window.CoupleApp?.auth?.isAuthed()) {
    window.location.replace(getNextUrl());
    return;
  }

  numpad.addEventListener("click", (e) => {
    const key = e.target.closest(".numpad__key");
    if (!key) return;

    const digit = key.dataset.digit;
    const action = key.dataset.action;

    if (digit !== undefined) {
      addDigit(digit);
      return;
    }

    if (action === "back") removeDigit();
    if (action === "clear") clearPasscode();
  });

  updateDisplay();
})();
