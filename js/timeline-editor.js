/* Timeline add / edit — modal + per-row info popout */
(function () {
  const modal = document.getElementById("timelineEditorModal");
  if (!modal) return;

  const form = document.getElementById("timelineEditorForm");
  const titleEl = document.getElementById("timelineEditorTitle");
  const titleInput = document.getElementById("festivalTitle");
  const taglineInput = document.getElementById("festivalTagline");
  const emojiInput = document.getElementById("festivalEmoji");
  const dateInput = document.getElementById("festivalDate");
  const authorInput = document.getElementById("festivalAuthor");
  const errorEl = document.getElementById("timelineEditorError");
  const saveBtn = document.getElementById("timelineEditorSave");
  const openAddBtn = document.getElementById("timelineAddBtn");
  const detailPopout = document.getElementById("timelineDetailPopout");
  const popoutEditBtn = document.getElementById("timelinePopoutEdit");
  const popoutDeleteBtn = document.getElementById("timelinePopoutDelete");
  const popoutCancelBtn = document.getElementById("timelinePopoutCancel");

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

  function formatTimelineDate(display) {
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
    document.querySelectorAll(".timeline__menu-btn").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
    openPopoutId = null;
  }

  function fillPopout(popout, festival) {
    popout.querySelector('[data-field="emoji"]').textContent =
      festival.emoji || "✦";
    popout.querySelector('[data-field="title"]').textContent =
      festival.title || "—";
    popout.querySelector('[data-field="tagline"]').textContent =
      festival.tagline?.trim() || "—";
    popout.querySelector('[data-field="date"]').textContent = festival.date
      ? formatTimelineDate(festival.date)
      : "—";
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

    const popoutHeight = detailPopout.offsetHeight || 320;
    if (top + popoutHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popoutHeight - gap);
    }

    detailPopout.style.top = `${top}px`;
    detailPopout.style.left = `${left}px`;
  }

  function openPopout(wrap, festival) {
    const btn = wrap.querySelector(".timeline__menu-btn");
    if (!detailPopout) return;

    if (openPopoutId === festival.id) {
      closeAllPopouts();
      return;
    }

    closeAllPopouts();
    fillPopout(detailPopout, festival);
    detailPopout.classList.remove("hidden");
    openPopoutId = festival.id;
    btn?.setAttribute("aria-expanded", "true");

    requestAnimationFrame(() => positionPopout(btn));
  }

  function openModal(mode, festival) {
    editingId = mode === "edit" ? festival?.id : null;
    clearError();

    titleEl.textContent = mode === "edit" ? "Edit timeline" : "Add to timeline";
    titleInput.value = festival?.title || "";
    taglineInput.value = festival?.tagline || "";
    emojiInput.value = festival?.emoji || "✦";
    dateInput.value = festival?.date || "";
    authorInput.value = festival?.author || "";

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

  function getFestivalFromForm() {
    const title = titleInput.value.trim();
    if (!title) return null;

    const date = dateInput.value.trim();
    if (date && !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return null;

    const existing = editingId
      ? manifestData.timeline.find((f) => f.id === editingId)
      : null;
    const id = editingId || slugFromTitle(title);

    const item = {
      id,
      title,
      tagline: taglineInput.value.trim(),
      emoji: emojiInput.value.trim() || "✦",
      updatedAt: todayIso(),
    };

    if (date) item.date = date;
    const author = authorInput.value.trim();
    if (author) item.author = author;

    return item;
  }

  async function persistTimeline(timeline) {
    const next = {
      ...manifestData,
      timeline,
      festivals: manifestData.festivals || [],
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
    const item = getFestivalFromForm();
    if (!item) {
      showError("Add a title. Date must be DD/MM/YYYY (e.g. 26/04/2026).");
      return;
    }

    let timeline = [...(manifestData.timeline || [])];

    if (editingId) {
      const idx = timeline.findIndex((f) => f.id === editingId);
      if (idx === -1) {
        showError("Timeline entry not found.");
        return;
      }
      timeline[idx] = { ...timeline[idx], ...item, id: editingId };
    } else {
      if (timeline.some((f) => f.id === item.id)) {
        showError("That timeline entry already exists. Try a different title.");
        return;
      }
      timeline.push(item);
    }

    saveBtn.disabled = true;
    const saved = await persistTimeline(timeline);
    saveBtn.disabled = false;

    if (!saved) return;

    closeModal();
    onSaved?.(saved);
    window.CoupleApp.homeToast?.("Timeline saved");
  }

  async function deleteFestival(id) {
    if (!confirm("Remove this from the timeline?")) return;

    const timeline = manifestData.timeline.filter((f) => f.id !== id);
    const saved = await persistTimeline(timeline);
    if (!saved) return;

    closeAllPopouts();
    onSaved?.(saved);
    window.CoupleApp.homeToast?.("Removed from timeline");
  }

  openAddBtn?.addEventListener("click", () => openModal("add"));

  document.getElementById("timelineEditorClose")?.addEventListener("click", closeModal);
  document.getElementById("timelineEditorCancel")?.addEventListener("click", closeModal);
  document.getElementById("timelineEditorBackdrop")?.addEventListener("click", closeModal);
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
    const festival = manifestData?.timeline?.find((f) => f.id === openPopoutId);
    if (festival) openModal("edit", festival);
  });

  popoutDeleteBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (openPopoutId) deleteFestival(openPopoutId);
  });

  document.addEventListener("click", (e) => {
    if (
      e.target.closest(".timeline__menu-wrap") ||
      e.target.closest("#timelineDetailPopout")
    ) {
      return;
    }
    closeAllPopouts();
  });

  window.addEventListener("resize", () => {
    if (!openPopoutId || detailPopout?.classList.contains("hidden")) return;
    const btn = document
      .querySelector(`.timeline__menu-wrap[data-festival-id="${openPopoutId}"]`)
      ?.querySelector(".timeline__menu-btn");
    positionPopout(btn);
  });

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.timelineEditor = {
    bind(data, rerender) {
      manifestData = data;
      onSaved = rerender;
    },

    attachRowMenus() {
      document.querySelectorAll(".timeline__menu-wrap").forEach((wrap) => {
        if (wrap.dataset.menuBound) return;
        wrap.dataset.menuBound = "1";

        wrap.querySelector(".timeline__menu-btn")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const id = wrap.dataset.festivalId;
          const festival = manifestData.timeline.find((f) => f.id === id);
          if (festival) openPopout(wrap, festival);
        });
      });
    },
  };
})();
