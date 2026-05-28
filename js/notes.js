/* Notes on home page — draggable pin board + add/edit modals */
(function () {
  const grid = document.getElementById("notesGrid");
  const emptyEl = document.getElementById("notesEmpty");
  const boardHintEl = document.getElementById("notesBoardHint");
  const notesSection = document.getElementById("homeNotes");
  const form = document.getElementById("notesForm");
  const addModal = document.getElementById("noteAddModal");
  const addBtn = document.getElementById("notesAddBtn");
  const bodyInput = document.getElementById("noteBody");
  const imageInput = document.getElementById("noteImage");
  const imagePickBtn = document.getElementById("noteImagePick");
  const imageClearBtn = document.getElementById("noteImageClear");
  const imagePreview = document.getElementById("noteImagePreview");
  const imagePreviewImg = document.getElementById("noteImagePreviewImg");
  const errorEl = document.getElementById("notesError");
  const authorHint = document.getElementById("notesAuthorHint");

  const detailPopout = document.getElementById("noteDetailPopout");
  const popoutEditBtn = document.getElementById("notePopoutEdit");
  const popoutDeleteBtn = document.getElementById("notePopoutDelete");
  const popoutCancelBtn = document.getElementById("notePopoutCancel");

  const editModal = document.getElementById("noteEditModal");
  const editForm = document.getElementById("noteEditForm");
  const editBodyInput = document.getElementById("editNoteBody");
  const editErrorEl = document.getElementById("noteEditError");
  const editImageInput = document.getElementById("editNoteImage");
  const editImagePickBtn = document.getElementById("editNoteImagePick");
  const editImageClearBtn = document.getElementById("editNoteImageClear");
  const editImagePreview = document.getElementById("editNoteImagePreview");
  const editImagePreviewImg = document.getElementById("editNoteImagePreviewImg");
  const composeFontSelect = document.getElementById("composeFontSelect");
  const editFontSelect = document.getElementById("editFontSelect");

  if (!grid) return;

  const COLOR = window.CoupleApp.noteColors;
  const FONT = window.CoupleApp.noteFonts;
  const PINS = window.CoupleApp.notePins;
  const NOTES_SEEN = window.CoupleApp.notesSeen;
  let notes = [];
  let pendingImageDataUrl = null;
  let openPopoutId = null;
  let editingId = null;
  let editPendingImageDataUrl = null;
  let editRemoveImage = false;
  let layoutFrame = 0;
  let resizeLayoutTimer = null;
  let autoLayoutPersistTimer = null;
  let layoutPersistAttempts = 0;
  let dragMoved = false;

  const BOARD_PAD = 12;
  const BOARD_GAP = 18;
  const NOTE_WIDTH = 220;
  const DRAG_THRESHOLD = 6;
  const NOTE_TILTS = [-2.4, -1.5, -0.7, 0.6, 1.2, 1.9, -1.1, 2.2, -1.8, 0.9];

  function hasSavedPosition(note) {
    return (
      note &&
      typeof note.x === "number" &&
      typeof note.y === "number" &&
      Number.isFinite(note.x) &&
      Number.isFinite(note.y)
    );
  }

  function defaultNoteRotation(note, index = 0) {
    let h = 0;
    const id = note.id || "";
    for (let i = 0; i < id.length; i += 1) {
      h = (h * 31 + id.charCodeAt(i)) | 0;
    }
    const slot = Math.abs(h + index * 7) % NOTE_TILTS.length;
    return NOTE_TILTS[slot];
  }

  function noteTiltDeg(note, index = 0) {
    if (typeof note.rotation === "number" && Number.isFinite(note.rotation)) {
      return note.rotation;
    }
    return defaultNoteRotation(note, index);
  }

  function applyNoteTilt(card, note, index = 0) {
    card.style.setProperty("--note-tilt", `${noteTiltDeg(note, index)}deg`);
  }

  function boardColumnWidth() {
    const boardW = grid?.clientWidth || NOTE_WIDTH;
    return Math.min(NOTE_WIDTH, Math.max(160, boardW - BOARD_PAD * 2));
  }

  function layoutNotesBoard() {
    if (!grid || !notes.length) {
      if (grid) grid.style.minHeight = "";
      return;
    }

    const colW = boardColumnWidth();
    const boardW = grid.clientWidth;
    const cols = Math.max(
      1,
      Math.floor((boardW - BOARD_PAD * 2 + BOARD_GAP) / (colW + BOARD_GAP))
    );
    const byId = Object.fromEntries(notes.map((n) => [n.id, n]));
    const cards = [...grid.querySelectorAll(".note-card")];

    let maxBottom = BOARD_PAD;
    const unplaced = [];

    cards.forEach((card) => {
      const note = byId[card.dataset.noteId];
      if (!note) return;
      const index = notes.findIndex((n) => n.id === note.id);

      card.style.width = `${colW}px`;
      applyNoteTilt(card, note, index);

      if (hasSavedPosition(note)) {
        card.style.left = `${note.x}px`;
        card.style.top = `${note.y}px`;
        card.dataset.boardLaidOut = "1";
        const bottom = note.y + card.offsetHeight;
        if (bottom > maxBottom) maxBottom = bottom;
      } else {
        card.style.left = "0px";
        card.style.top = "0px";
        delete card.dataset.boardLaidOut;
        unplaced.push(card);
      }
    });

    const colHeights = Array(cols).fill(maxBottom + (unplaced.length ? BOARD_GAP : 0));

    unplaced.forEach((card) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = BOARD_PAD + col * (colW + BOARD_GAP);
      const y = colHeights[col];
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      card.dataset.boardLaidOut = "1";
      const h = card.offsetHeight;
      colHeights[col] = y + h + BOARD_GAP;
    });

    const boardHeight = Math.max(maxBottom + BOARD_PAD, ...colHeights, 180);
    grid.style.minHeight = `${boardHeight}px`;
    schedulePersistBoardLayout();
  }

  function schedulePersistBoardLayout() {
    const needsPersist = notes.some(
      (n) =>
        !hasSavedPosition(n) ||
        typeof n.rotation !== "number" ||
        !n.pin
    );
    if (!needsPersist) return;

    clearTimeout(autoLayoutPersistTimer);
    autoLayoutPersistTimer = setTimeout(async () => {
      const saved = await persistBoardLayoutFromDom();
      if (
        !saved &&
        layoutPersistAttempts < 6 &&
        notes.some((n) => !hasSavedPosition(n))
      ) {
        layoutPersistAttempts += 1;
        schedulePersistBoardLayout();
      }
    }, layoutPersistAttempts === 0 ? 300 : 700);
  }

  async function persistBoardLayoutFromDom() {
    if (!grid || !notes.length) return false;

    let changed = false;
    const next = notes.map((note, index) => {
      const rotation = noteTiltDeg(note, index);
      const pin = PINS?.pickPinOption?.(note, index)?.id;

      if (hasSavedPosition(note)) {
        if (
          typeof note.rotation === "number" &&
          note.rotation === rotation &&
          note.pin === pin
        ) {
          return note;
        }
        changed = true;
        return { ...note, rotation, ...(pin ? { pin } : {}) };
      }

      const card = grid.querySelector(
        `.note-card[data-note-id="${note.id}"]`
      );
      if (!card || !card.dataset.boardLaidOut || card.offsetHeight === 0) {
        return note;
      }

      const x = Math.round(parseFloat(card.style.left) || 0);
      const y = Math.round(parseFloat(card.style.top) || 0);

      changed = true;
      return { ...note, x, y, rotation, ...(pin ? { pin } : {}) };
    });

    if (!changed) return true;

    const ok = await persist(next);
    if (ok) {
      notes = next;
      layoutPersistAttempts = 0;
    }
    return ok;
  }

  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutNotesBoard();
      if (openPopoutId && !detailPopout?.classList.contains("hidden")) {
        const card = document.querySelector(
          `.note-card[data-note-id="${openPopoutId}"]`
        );
        positionPopout(card?.querySelector(".note-card__menu-btn"));
      }
    });
  }

  function clampCardPosition(left, top, card) {
    const boardW = grid.clientWidth;
    const cardW = card.offsetWidth;
    const maxX = Math.max(0, boardW - cardW - BOARD_PAD);
    return {
      x: Math.round(Math.max(0, Math.min(maxX, left))),
      y: Math.round(Math.max(0, top)),
    };
  }

  function attachNoteDrag(card, note) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    const onPointerMove = (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragMoved = true;
      closeAllPopouts();

      const next = clampCardPosition(originLeft + dx, originTop + dy, card);
      card.style.left = `${next.x}px`;
      card.style.top = `${next.y}px`;

      const bottom = next.y + card.offsetHeight + BOARD_PAD;
      const minH = parseFloat(grid.style.minHeight) || 0;
      if (bottom > minH) grid.style.minHeight = `${bottom}px`;
    };

    const finishDrag = async (e) => {
      if (e.pointerId !== pointerId) return;
      card.releasePointerCapture?.(e.pointerId);
      card.classList.remove("note-card--dragging");
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerup", finishDrag);
      card.removeEventListener("pointercancel", finishDrag);
      pointerId = null;

      if (!dragMoved) return;

      const left = parseFloat(card.style.left) || 0;
      const top = parseFloat(card.style.top) || 0;
      const pos = clampCardPosition(left, top, card);
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;

      const idx = notes.findIndex((n) => n.id === note.id);
      if (idx === -1) return;

      const next = notes.map((n, i) =>
        i === idx
          ? {
              ...n,
              x: pos.x,
              y: pos.y,
              rotation: noteTiltDeg(n, i),
            }
          : n
      );
      const ok = await persist(next);
      if (ok) {
        notes = next;
        scheduleLayout();
      } else {
        renderNotes();
      }

      setTimeout(() => {
        dragMoved = false;
      }, 0);
    };

    card.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (
        e.target.closest(".note-card__menu-btn") ||
        e.target.closest(".note-card__menu-wrap")
      ) {
        return;
      }

      dragMoved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      originLeft = parseFloat(card.style.left) || 0;
      originTop = parseFloat(card.style.top) || 0;

      card.setPointerCapture(e.pointerId);
      card.classList.add("note-card--dragging");
      card.addEventListener("pointermove", onPointerMove);
      card.addEventListener("pointerup", finishDrag);
      card.addEventListener("pointercancel", finishDrag);
      e.preventDefault();
    });
  }

  function markNoteCardRead(noteId, card) {
    if (!noteId || !NOTES_SEEN) return;
    NOTES_SEEN.markRead(noteId);
    card?.querySelector(".note-card__new-dot")?.classList.add("hidden");
  }

  function showToast(message) {
    if (window.CoupleApp.homeToast) {
      window.CoupleApp.homeToast(message);
      return;
    }
  }

  function openComposeModal() {
    if (!addModal) return;
    window.CoupleApp.timelineEditor?.closePopouts?.();
    window.CoupleApp.cardEditor?.closePopouts?.();
    closeAllPopouts();
    clearError();

    const name = window.CoupleApp.auth?.getDisplayName?.();
    if (authorHint) {
      authorHint.textContent = name ? `Posting as ${name}` : "Posting as you";
    }

    renderColorPicker(
      document.getElementById("composeColorPicker"),
      "noteColor",
      COLOR.defaultId
    );
    renderFontSelect(composeFontSelect, FONT.defaultId, bodyInput);
    clearComposeImage();
    if (bodyInput) bodyInput.value = "";

    addModal.classList.remove("hidden");
    addModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("timeline-editor-open");
    bodyInput?.focus();
  }

  function closeComposeModal() {
    addModal?.classList.add("hidden");
    addModal?.setAttribute("aria-hidden", "true");
    if (!editModal?.classList.contains("hidden")) return;
    document.body.classList.remove("timeline-editor-open");
    clearComposeImage();
    clearError();
  }

  function isComposeOpen() {
    return addModal && !addModal.classList.contains("hidden");
  }

  function showError(msg, target = errorEl) {
    if (!target) return;
    target.textContent = msg;
    target.classList.remove("hidden");
  }

  function clearError(target = errorEl) {
    target?.classList.add("hidden");
    if (target) target.textContent = "";
  }

  function noteColorId(note) {
    return COLOR.isValid(note.color) ? note.color : COLOR.defaultId;
  }

  function renderColorPicker(container, name, selectedId) {
    if (!container) return;
    const selected = COLOR.isValid(selectedId) ? selectedId : COLOR.defaultId;
    container.replaceChildren();
    COLOR.list.forEach((c) => {
      const label = document.createElement("label");
      label.className = "notes-color-picker__option";
      label.innerHTML = `
        <input type="radio" name="${name}" value="${c.id}" ${c.id === selected ? "checked" : ""} />
        <span class="notes-color-picker__swatch notes-color-picker__swatch--${c.id}" title="${c.label}"></span>
      `;
      container.appendChild(label);
    });
  }

  function getSelectedColor(container, name) {
    const picked = container?.querySelector(`input[name="${name}"]:checked`);
    const value = picked?.value || COLOR.defaultId;
    return COLOR.isValid(value) ? value : COLOR.defaultId;
  }

  function noteFontId(note) {
    return FONT.isValid(note.font) ? note.font : FONT.defaultId;
  }

  function renderFontSelect(selectEl, selectedId, previewEl) {
    if (!selectEl) return;
    const selected = FONT.isValid(selectedId) ? selectedId : FONT.defaultId;

    if (!selectEl.dataset.fontOptionsBuilt) {
      selectEl.dataset.fontOptionsBuilt = "1";
      FONT.list.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.label;
        opt.style.fontFamily = f.family;
        selectEl.appendChild(opt);
      });
      if (previewEl) {
        selectEl.addEventListener("change", () => {
          FONT.applyToElement(previewEl, selectEl.value);
        });
      }
    }

    selectEl.value = selected;
    if (previewEl) FONT.applyToElement(previewEl, selected);
  }

  function getSelectedFont(selectEl) {
    const value = selectEl?.value || FONT.defaultId;
    return FONT.isValid(value) ? value : FONT.defaultId;
  }

  function formatWhen(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function clearComposeImage() {
    pendingImageDataUrl = null;
    if (imageInput) imageInput.value = "";
    imagePreview?.classList.add("hidden");
    if (imagePreviewImg) {
      imagePreviewImg.removeAttribute("src");
      imagePreviewImg.alt = "";
    }
    imageClearBtn?.classList.add("hidden");
  }

  function setComposeImagePreview(dataUrl, name) {
    pendingImageDataUrl = dataUrl;
    if (imagePreviewImg) {
      imagePreviewImg.src = dataUrl;
      imagePreviewImg.alt = name ? `Preview: ${name}` : "Selected image preview";
    }
    imagePreview?.classList.remove("hidden");
    imageClearBtn?.classList.remove("hidden");
  }

  function clearEditImageState() {
    editPendingImageDataUrl = null;
    editRemoveImage = false;
    if (editImageInput) editImageInput.value = "";
    editImagePreview?.classList.add("hidden");
    if (editImagePreviewImg) {
      editImagePreviewImg.removeAttribute("src");
      editImagePreviewImg.alt = "";
    }
    editImageClearBtn?.classList.add("hidden");
  }

  function showEditImagePreview(src, name, showRemove) {
    if (editImagePreviewImg) {
      editImagePreviewImg.src = src;
      editImagePreviewImg.alt = name || "Note image";
    }
    editImagePreview?.classList.remove("hidden");
    editImageClearBtn?.classList.toggle("hidden", !showRemove);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    });
  }

  function closeAllPopouts() {
    detailPopout?.classList.add("hidden");
    document.querySelectorAll(".note-card__menu-btn").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
    openPopoutId = null;
  }

  function positionPopout(anchorBtn) {
    if (!detailPopout || !anchorBtn) return;

    const rect = anchorBtn.getBoundingClientRect();
    const gap = 6;
    const popoutWidth = detailPopout.offsetWidth || 160;

    let top = rect.bottom + gap;
    let left = rect.right - popoutWidth;

    if (left < 12) left = 12;
    if (left + popoutWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoutWidth - 12;
    }

    const popoutHeight = detailPopout.offsetHeight || 140;
    if (top + popoutHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popoutHeight - gap);
    }

    detailPopout.style.top = `${top}px`;
    detailPopout.style.left = `${left}px`;
  }

  function openPopout(btn, noteId) {
    if (!detailPopout) return;

    if (openPopoutId === noteId) {
      closeAllPopouts();
      return;
    }

    closeAllPopouts();
    detailPopout.classList.remove("hidden");
    openPopoutId = noteId;
    btn?.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => positionPopout(btn));
  }

  function closeEditModal() {
    editModal?.classList.add("hidden");
    editModal?.setAttribute("aria-hidden", "true");
    if (!isComposeOpen()) {
      document.body.classList.remove("timeline-editor-open");
    }
    editingId = null;
    clearEditImageState();
    clearError(editErrorEl);
  }

  function openEditModal(note) {
    editingId = note.id;
    clearError(editErrorEl);
    closeAllPopouts();

    editBodyInput.value = note.body || "";
    renderColorPicker(
      document.getElementById("editColorPicker"),
      "editNoteColor",
      noteColorId(note)
    );
    renderFontSelect(editFontSelect, noteFontId(note), editBodyInput);

    clearEditImageState();
    if (note.image) {
      showEditImagePreview(`assets/${note.image}`, "Current photo", true);
    }

    closeComposeModal();
    editModal?.classList.remove("hidden");
    editModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("timeline-editor-open");
    editBodyInput?.focus();
  }

  function renderNotes() {
    layoutPersistAttempts = 0;
    grid.replaceChildren();
    const hasNotes = notes.length > 0;
    emptyEl?.classList.toggle("hidden", hasNotes);
    boardHintEl?.classList.toggle("hidden", !hasNotes);

    notes.forEach((note, index) => {
      const color = noteColorId(note);
      const card = document.createElement("article");
      card.className = `note-card note-card--${color}`;
      card.dataset.noteId = note.id;

      const imageHtml = note.image
        ? `<img class="note-card__image" src="assets/${note.image}" alt="" loading="lazy" />`
        : "";

      const bodyHtml = note.body ? `<p class="note-card__body"></p>` : "";

      const showNewDot = NOTES_SEEN?.isUnread?.(note) ?? false;

      card.innerHTML = `
        <span class="note-card__new-dot${showNewDot ? "" : " hidden"}" title="New note" aria-label="New note"></span>
        ${imageHtml}
        ${bodyHtml}
        <footer class="note-card__footer">
          <div class="note-card__meta">
            <span class="note-card__author"></span>
            <time class="note-card__time" datetime=""></time>
          </div>
          <div class="note-card__menu-wrap">
            <button type="button" class="note-card__menu-btn" aria-label="Note options" title="Options" aria-expanded="false">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.75"/>
                <circle cx="12" cy="12" r="1.75"/>
                <circle cx="12" cy="19" r="1.75"/>
              </svg>
            </button>
          </div>
        </footer>
      `;

      const pinEl = PINS?.createPinElement?.(note, index);
      if (pinEl) card.prepend(pinEl);

      const bodyEl = card.querySelector(".note-card__body");
      if (bodyEl) {
        bodyEl.textContent = note.body;
        FONT.applyToElement(bodyEl, noteFontId(note));
      }

      card.querySelector(".note-card__author").textContent = note.author || "—";
      const timeEl = card.querySelector(".note-card__time");
      timeEl.dateTime = note.createdAt || "";
      timeEl.textContent = formatWhen(note.createdAt);

      const menuBtn = card.querySelector(".note-card__menu-btn");
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dragMoved) return;
        openPopout(menuBtn, note.id);
      });

      card.addEventListener("click", (e) => {
        if (dragMoved) return;
        if (e.target.closest(".note-card__menu-wrap")) return;
        markNoteCardRead(note.id, card);
      });

      card.querySelectorAll(".note-card__image").forEach((img) => {
        if (img.complete) return;
        img.addEventListener("load", scheduleLayout, { once: true });
      });

      applyNoteTilt(card, note, index);
      attachNoteDrag(card, note);
      grid.appendChild(card);
    });

    scheduleLayout();
  }

  async function persist(nextNotes) {
    const result = await window.CoupleApp.notesStore.save(nextNotes);
    if (!result.ok) {
      showError(result.error);
      return false;
    }
    notes = result.notes || nextNotes;
    if (result.message) showToast(result.message);
    return true;
  }

  async function deleteNote(id) {
    if (!confirm("Remove this note from the board?")) return;
    const next = notes.filter((n) => n.id !== id);
    if (await persist(next)) {
      closeAllPopouts();
      renderNotes();
      showToast("Note removed");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const body = bodyInput.value.trim();
    if (!body && !pendingImageDataUrl) {
      showError("Write a message or add a photo.");
      return;
    }
    if (body.length > 500) {
      showError("Keep it under 500 characters.");
      return;
    }

    const author = window.CoupleApp.auth?.getDisplayName?.() || "Us";
    const noteId = `note-${Date.now()}`;
    const note = {
      id: noteId,
      author,
      body,
      color: getSelectedColor(
        document.getElementById("composeColorPicker"),
        "noteColor"
      ),
      font: getSelectedFont(composeFontSelect),
      createdAt: new Date().toISOString(),
      rotation: defaultNoteRotation({ id: noteId }, notes.length),
      pin: PINS?.pickPinOption?.({ id: noteId }, notes.length)?.id,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    if (pendingImageDataUrl) {
      const uploaded = await window.CoupleApp.notesStore.uploadImage(
        noteId,
        pendingImageDataUrl
      );
      if (!uploaded.ok) {
        submitBtn.disabled = false;
        showError(uploaded.error);
        return;
      }
      note.image = uploaded.image;
    }

    const ok = await persist([note, ...notes]);
    submitBtn.disabled = false;

    if (!ok) return;

    NOTES_SEEN?.markRead?.(noteId);
    closeComposeModal();
    renderNotes();
    showToast("Note added ♡");
    document.getElementById("homeNotes")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    clearError(editErrorEl);

    const idx = notes.findIndex((n) => n.id === editingId);
    if (idx === -1) {
      showError("Note not found.", editErrorEl);
      return;
    }

    const body = editBodyInput.value.trim();
    const existing = notes[idx];
    const willHaveImage =
      editPendingImageDataUrl ||
      (existing.image && !editRemoveImage);

    if (!body && !willHaveImage) {
      showError("Write a message or keep a photo.", editErrorEl);
      return;
    }
    if (body.length > 500) {
      showError("Keep it under 500 characters.", editErrorEl);
      return;
    }

    const updated = {
      ...existing,
      body,
      color: getSelectedColor(
        document.getElementById("editColorPicker"),
        "editNoteColor"
      ),
      font: getSelectedFont(editFontSelect),
    };

    const saveBtn = document.getElementById("noteEditSave");
    saveBtn.disabled = true;

    if (editRemoveImage) {
      delete updated.image;
    }

    if (editPendingImageDataUrl) {
      const uploaded = await window.CoupleApp.notesStore.uploadImage(
        editingId,
        editPendingImageDataUrl
      );
      if (!uploaded.ok) {
        saveBtn.disabled = false;
        showError(uploaded.error, editErrorEl);
        return;
      }
      updated.image = uploaded.image;
    }

    const next = [...notes];
    next[idx] = updated;

    const ok = await persist(next);
    saveBtn.disabled = false;

    if (!ok) return;

    closeEditModal();
    renderNotes();
    showToast("Note updated");
  }

  async function handleImagePick(inputEl) {
    inputEl?.click();
  }

  async function handleImageChange(file, { compose }) {
    clearError(compose ? errorEl : editErrorEl);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Choose a JPEG, PNG, WebP, or GIF.", compose ? errorEl : editErrorEl);
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showError("Image must be under 3 MB.", compose ? errorEl : editErrorEl);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (compose) {
        setComposeImagePreview(dataUrl, file.name);
      } else {
        editPendingImageDataUrl = dataUrl;
        editRemoveImage = false;
        showEditImagePreview(dataUrl, file.name, true);
      }
    } catch {
      showError("Could not read that image.", compose ? errorEl : editErrorEl);
    }
  }

  function handleEditImageClear() {
    editPendingImageDataUrl = null;
    editRemoveImage = true;
    if (editImageInput) editImageInput.value = "";
    editImagePreview?.classList.add("hidden");
    editImageClearBtn?.classList.add("hidden");
  }

  async function init() {
    const name = window.CoupleApp.auth?.getDisplayName?.();
    if (authorHint && name) {
      authorHint.textContent = `Posting as ${name}`;
    }

    try {
      await PINS?.loadCustomPins?.();
      const loaded = await window.CoupleApp.notesStore.load();
      notes = (loaded.notes || []).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
      NOTES_SEEN?.bootstrapExisting?.(notes);
      renderNotes();
      if (loaded.syncLayoutToServer && notes.length) {
        await persistBoardLayoutFromDom();
      }
    } catch {
      showError("Could not load notes. Refresh to try again.");
    }

    addBtn?.addEventListener("click", openComposeModal);
    document.getElementById("noteAddClose")?.addEventListener("click", closeComposeModal);
    document.getElementById("noteAddCancel")?.addEventListener("click", closeComposeModal);
    document.getElementById("noteAddBackdrop")?.addEventListener("click", closeComposeModal);

    form?.addEventListener("submit", handleSubmit);
    imagePickBtn?.addEventListener("click", () => handleImagePick(imageInput));
    imageInput?.addEventListener("change", () =>
      handleImageChange(imageInput.files?.[0], { compose: true })
    );
    imageClearBtn?.addEventListener("click", clearComposeImage);

    editForm?.addEventListener("submit", handleEditSubmit);
    editImagePickBtn?.addEventListener("click", () => handleImagePick(editImageInput));
    editImageInput?.addEventListener("change", () =>
      handleImageChange(editImageInput.files?.[0], { compose: false })
    );
    editImageClearBtn?.addEventListener("click", handleEditImageClear);

    document.getElementById("noteEditClose")?.addEventListener("click", closeEditModal);
    document.getElementById("noteEditCancel")?.addEventListener("click", closeEditModal);
    document.getElementById("noteEditBackdrop")?.addEventListener("click", closeEditModal);

    popoutCancelBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllPopouts();
    });

    popoutEditBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      const note = notes.find((n) => n.id === openPopoutId);
      if (note) openEditModal(note);
    });

    popoutDeleteBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (openPopoutId) deleteNote(openPopoutId);
    });

    document.addEventListener("click", (e) => {
      if (
        e.target.closest(".note-card__menu-wrap") ||
        e.target.closest("#noteDetailPopout") ||
        e.target.closest("#noteAddModal") ||
        e.target.closest("#notesAddBtn")
      ) {
        return;
      }
      closeAllPopouts();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isComposeOpen()) {
        closeComposeModal();
        return;
      }
      if (editModal && !editModal.classList.contains("hidden")) {
        closeEditModal();
        return;
      }
      closeAllPopouts();
    });

    window.addEventListener("resize", () => {
      clearTimeout(resizeLayoutTimer);
      resizeLayoutTimer = setTimeout(scheduleLayout, 120);
    });

    if (location.hash === "#homeNotes") {
      notesSection?.scrollIntoView({ behavior: "smooth" });
    }

    window.addEventListener("pagehide", () => {
      persistBoardLayoutFromDom();
    });
  }

  init();
})();
