/* Moment card edit / delete — menu popout + modal */
(function () {
  const modal = document.getElementById("cardEditorModal");
  if (!modal) return;

  const form = document.getElementById("cardEditorForm");
  const titleEl = document.getElementById("cardEditorTitle");
  const titleInput = document.getElementById("cardTitle");
  const taglineInput = document.getElementById("cardTagline");
  const emojiInput = document.getElementById("cardEmoji");
  const dateInput = document.getElementById("cardDate");
  const authorInput = document.getElementById("cardAuthor");
  const statusInput = document.getElementById("cardStatus");
  const errorEl = document.getElementById("cardEditorError");
  const saveBtn = document.getElementById("cardEditorSave");
  const detailPopout = document.getElementById("cardDetailPopout");
  const popoutEditBtn = document.getElementById("cardPopoutEdit");
  const popoutDeleteBtn = document.getElementById("cardPopoutDelete");
  const popoutCancelBtn = document.getElementById("cardPopoutCancel");

  let manifestData = null;
  let editingId = null;
  let onSaved = null;
  let openPopoutId = null;

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function slugFromTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function parseDisplayDate(display) {
    const parts = display?.split("/");
    if (!parts || parts.length !== 3) return null;
    const [day, month, year] = parts.map((p) => parseInt(p, 10));
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  function formatCardDate(display) {
    const d = parseDisplayDate(display);
    if (!d) return display?.trim() || "—";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function clearError() {
    errorEl?.classList.add("hidden");
    if (errorEl) errorEl.textContent = "";
  }

  function closeAllPopouts() {
    detailPopout?.classList.add("hidden");
    document.querySelectorAll(".festival-card__menu-btn").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
    openPopoutId = null;
  }

  function fillPopout(festival) {
    if (!detailPopout) return;
    detailPopout.querySelector('[data-field="emoji"]').textContent =
      festival.emoji || "✦";
    detailPopout.querySelector('[data-field="title"]').textContent =
      festival.title || "—";
    detailPopout.querySelector('[data-field="tagline"]').textContent =
      festival.tagline?.trim() || "—";
    detailPopout.querySelector('[data-field="date"]').textContent = festival.date
      ? formatCardDate(festival.date)
      : "—";
    const statusEl = detailPopout.querySelector('[data-field="status"]');
    if (statusEl) {
      statusEl.textContent =
        festival.status === "ready" ? "Ready — opens moment" : "Coming soon";
    }
  }

  function positionPopout(anchorBtn) {
    if (!detailPopout || !anchorBtn) return;

    const rect = anchorBtn.getBoundingClientRect();
    const gap = 6;
    const popoutWidth = detailPopout.offsetWidth || 280;

    let top = rect.bottom + gap;
    let left = rect.right - popoutWidth;

    if (left < 12) left = 12;
    if (left + popoutWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoutWidth - 12;
    }

    const popoutHeight = detailPopout.offsetHeight || 340;
    if (top + popoutHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popoutHeight - gap);
    }

    detailPopout.style.top = `${top}px`;
    detailPopout.style.left = `${left}px`;
  }

  function openPopout(wrap, festival) {
    const btn = wrap.querySelector(".festival-card__menu-btn");
    if (!detailPopout) return;

    if (openPopoutId === festival.id) {
      closeAllPopouts();
      return;
    }

    window.CoupleApp.timelineEditor?.closePopouts?.();
    closeAllPopouts();
    fillPopout(festival);
    detailPopout.classList.remove("hidden");
    openPopoutId = festival.id;
    btn?.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => positionPopout(btn));
  }

  function openModal(festival) {
    editingId = festival?.id || null;
    clearError();

    titleEl.textContent = "Edit moment";
    titleInput.value = festival?.title || "";
    taglineInput.value = festival?.tagline || "";
    emojiInput.value = festival?.emoji || "✦";
    dateInput.value = festival?.date || "";
    authorInput.value = festival?.author || "";
    statusInput.value = festival?.status === "ready" ? "ready" : "coming-soon";

    closeAllPopouts();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("timeline-editor-open");
    titleInput.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("timeline-editor-open");
    editingId = null;
  }

  function getCardFromForm() {
    const title = titleInput.value.trim();
    if (!title) return null;

    const date = dateInput.value.trim();
    if (date && !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return null;

    const existing = editingId
      ? manifestData.festivals.find((f) => f.id === editingId)
      : null;
    const id = editingId || slugFromTitle(title);

    const item = {
      id,
      title,
      tagline: taglineInput.value.trim(),
      emoji: emojiInput.value.trim() || "✦",
      status: statusInput.value === "ready" ? "ready" : "coming-soon",
      updatedAt: existing?.updatedAt || todayIso(),
    };

    if (date) item.date = date;
    const author = authorInput.value.trim();
    if (author) item.author = author;

    return item;
  }

  async function persistFestivals(festivals) {
    const next = {
      ...manifestData,
      festivals,
      timeline: manifestData.timeline || [],
    };
    const result = await window.CoupleApp.manifestStore.save(next);
    if (!result.ok) {
      showError(result.error);
      return null;
    }
    manifestData = result.manifest || next;
    if (result.persisted === "local" && !result.message) {
      result.message =
        "Saved on this device only (run npm start to update the file).";
    }
    if (result.message && window.CoupleApp.homeToast) {
      window.CoupleApp.homeToast(result.message);
    }
    return manifestData;
  }

  async function handleSave() {
    clearError();
    const item = getCardFromForm();
    if (!item) {
      showError("Add a title. Date must be DD/MM/YYYY (e.g. 26/04/2026).");
      return;
    }

    const festivals = [...(manifestData.festivals || [])];
    const idx = festivals.findIndex((f) => f.id === editingId);
    if (idx === -1) {
      showError("Moment not found.");
      return;
    }

    festivals[idx] = { ...festivals[idx], ...item, id: editingId };

    saveBtn.disabled = true;
    const saved = await persistFestivals(festivals);
    saveBtn.disabled = false;

    if (!saved) return;

    closeModal();
    onSaved?.(saved);
    window.CoupleApp.homeToast?.("Moment saved");
  }

  async function deleteCard(id) {
    if (!confirm("Remove this moment card? The festival page file is not deleted.")) {
      return;
    }

    const festivals = manifestData.festivals.filter((f) => f.id !== id);
    const saved = await persistFestivals(festivals);
    if (!saved) return;

    closeAllPopouts();
    onSaved?.(saved);
    window.CoupleApp.homeToast?.("Moment removed");
  }

  document.getElementById("cardEditorClose")?.addEventListener("click", closeModal);
  document.getElementById("cardEditorCancel")?.addEventListener("click", closeModal);
  document.getElementById("cardEditorBackdrop")?.addEventListener("click", closeModal);
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSave();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.classList.contains("hidden")) {
      closeModal();
      return;
    }
    closeAllPopouts();
  });

  popoutCancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeAllPopouts();
  });

  popoutEditBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const festival = manifestData?.festivals?.find((f) => f.id === openPopoutId);
    if (festival) openModal(festival);
  });

  popoutDeleteBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (openPopoutId) deleteCard(openPopoutId);
  });

  document.addEventListener("click", (e) => {
    if (
      e.target.closest(".festival-card__menu-wrap") ||
      e.target.closest("#cardDetailPopout")
    ) {
      return;
    }
    closeAllPopouts();
  });

  window.addEventListener("resize", () => {
    if (!openPopoutId || detailPopout?.classList.contains("hidden")) return;
    const btn = document
      .querySelector(`.festival-card__menu-wrap[data-festival-id="${openPopoutId}"]`)
      ?.querySelector(".festival-card__menu-btn");
    positionPopout(btn);
  });

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.cardEditor = {
    bind(data, rerender) {
      manifestData = data;
      onSaved = rerender;
    },

    closePopouts: closeAllPopouts,

    attachCardMenus() {
      document.querySelectorAll(".festival-card__menu-wrap").forEach((wrap) => {
        if (wrap.dataset.menuBound) return;
        wrap.dataset.menuBound = "1";

        wrap.querySelector(".festival-card__menu-btn")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const id = wrap.dataset.festivalId;
          const festival = manifestData.festivals.find((f) => f.id === id);
          if (festival) openPopout(wrap, festival);
        });
      });
    },
  };
})();
