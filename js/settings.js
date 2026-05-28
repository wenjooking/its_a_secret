(function () {
  const MUSIC_KEY = "couple_music_autoplay";
  const SEEN_KEY = "couple_festival_seen";

  const userNameEl = document.getElementById("settingsUserName");
  const userAvatarEl = document.getElementById("settingsUserAvatar");
  const musicAutoplay = document.getElementById("musicAutoplay");
  const resetNewBadges = document.getElementById("resetNewBadges");
  const toast = document.getElementById("settingsToast");

  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  function initProfile() {
    const name = window.CoupleApp?.auth?.getDisplayName?.() || "";
    if (userNameEl) {
      userNameEl.textContent = name || "—";
      userNameEl.title = name
        ? ""
        : "Sign out and sign in again with your name on the login page";
    }
    window.CoupleApp?.auth?.fillProfileBadge?.(userAvatarEl);
  }

  function initMusicToggle() {
    if (!musicAutoplay) return;
    musicAutoplay.checked = localStorage.getItem(MUSIC_KEY) !== "0";
    musicAutoplay.addEventListener("change", () => {
      localStorage.setItem(MUSIC_KEY, musicAutoplay.checked ? "1" : "0");
      showToast(musicAutoplay.checked ? "Music will autoplay" : "Music won’t autoplay");
    });
  }

  resetNewBadges?.addEventListener("click", () => {
    localStorage.removeItem(SEEN_KEY);
    window.CoupleApp?.notesSeen?.clear?.({ fromReset: true });
    showToast("“New” badges restored on this device");
  });

  document.getElementById("signOut")?.addEventListener("click", () => {
    window.CoupleApp?.auth?.signOut();
  });

  function initPasscodeChange() {
    const modal = document.getElementById("passcodeModal");
    const openBtn = document.getElementById("openPasscodeChange");
    const numpad = document.getElementById("settingsNumpad");
    const errorEl = document.getElementById("passcodeChangeError");
    const updateBtn = document.getElementById("updatePasscode");
    const closeBtn = document.getElementById("closePasscodeChange");
    const cancelBtn = document.getElementById("cancelPasscodeChange");
    const backdrop = document.getElementById("passcodeModalBackdrop");

    if (!modal || !openBtn || !numpad || !updateBtn || !window.CoupleApp?.passcodeNumpad) {
      return;
    }

    const pad = window.CoupleApp.passcodeNumpad.init({
      numpadEl: numpad,
      fields: [
        {
          key: "current",
          displayEl: document.getElementById("passcodeCurrent"),
          valueEl: document.getElementById("passcodeCurrentValue"),
        },
        {
          key: "new",
          displayEl: document.getElementById("passcodeNew"),
          valueEl: document.getElementById("passcodeNewValue"),
        },
        {
          key: "confirm",
          displayEl: document.getElementById("passcodeConfirm"),
          valueEl: document.getElementById("passcodeConfirmValue"),
        },
      ],
    });

    function showPasscodeError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }

    function clearPasscodeError() {
      errorEl?.classList.add("hidden");
      if (errorEl) errorEl.textContent = "";
    }

    function openModal() {
      pad.clearAll();
      clearPasscodeError();
      pad.setActive("current");
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("passcode-modal-open");
      requestAnimationFrame(() => {
        document.getElementById("passcodeCurrent")?.focus();
      });
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("passcode-modal-open");
      pad.clearAll();
      clearPasscodeError();
      openBtn.focus();
    }

    openBtn.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    backdrop?.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });

    updateBtn.addEventListener("click", async () => {
      clearPasscodeError();
      const current = pad.getCode("current");
      const next = pad.getCode("new");
      const confirm = pad.getCode("confirm");

      if (!current || !next || !confirm) {
        showPasscodeError("Enter all three passcodes (8 digits each).");
        return;
      }

      if (next !== confirm) {
        showPasscodeError("New passcode and confirmation don’t match.");
        pad.setActive("confirm");
        return;
      }

      if (current === next) {
        showPasscodeError("New passcode must be different from the current one.");
        return;
      }

      updateBtn.disabled = true;
      const result = await window.CoupleApp.auth.changePasscode(current, next);
      updateBtn.disabled = false;

      if (!result.ok) {
        showPasscodeError(result.error);
        return;
      }

      closeModal();
      showToast("Passcode updated");
    });
  }

  initProfile();
  initMusicToggle();
  initPasscodeChange();
})();
