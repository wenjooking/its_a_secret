/* Canvas drawing pad — pencil, eraser, color wheel, transparent PNG export */
(function () {
  const DEFAULT_COLOR = "#2a2030";

  function setupCanvas(canvas) {
    const wrap = canvas.closest(".notes-draw-canvas-wrap") || canvas.parentElement;
    const w = Math.max(wrap?.clientWidth || 0, 260);
    const h = Math.max(wrap?.clientHeight || 0, 220);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function createPad(canvas, options = {}) {
    if (!canvas) return null;

    let { ctx, w, h } = setupCanvas(canvas);
    let color = options.color || DEFAULT_COLOR;
    let size = options.size || 4;
    let tool = "pencil";
    let hasStrokes = false;
    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function clearCanvas() {
      ctx.clearRect(0, 0, w, h);
    }

    function applyToolStyles() {
      const isEraser = tool === "eraser";
      canvas.classList.toggle("notes-draw-canvas--eraser", isEraser);
      options.onToolChange?.(tool);
    }

    function clear() {
      hasStrokes = false;
      ({ ctx, w, h } = setupCanvas(canvas));
      clearCanvas();
      applyToolStyles();
      options.onChange?.(false);
    }

    function loadImage(src) {
      return new Promise((resolve) => {
        if (!src) {
          resolve();
          return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ({ ctx, w, h } = setupCanvas(canvas));
          clearCanvas();
          const scale = Math.min(w / img.width, h / img.height, 1);
          const dw = img.width * scale;
          const dh = img.height * scale;
          ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
          hasStrokes = true;
          applyToolStyles();
          options.onChange?.(true);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });
    }

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function strokeTo(x, y) {
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = Math.max(size * 1.8, 8);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      lastX = x;
      lastY = y;
    }

    function onPointerDown(e) {
      if (e.button === 2 || e.button === 1) return;
      drawing = true;
      hasStrokes = true;
      const p = pointerPos(e);
      lastX = p.x;
      lastY = p.y;
      strokeTo(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      options.onChange?.(true);
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!drawing) return;
      const p = pointerPos(e);
      strokeTo(p.x, p.y);
      e.preventDefault();
    }

    function onPointerUp(e) {
      if (!drawing) return;
      drawing = false;
      canvas.releasePointerCapture?.(e.pointerId);
      options.onChange?.(hasStrokes);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    clearCanvas();
    applyToolStyles();

    return {
      clear,
      hasContent: () => hasStrokes,
      toDataURL: () => canvas.toDataURL("image/png"),
      loadImage,
      getTool: () => tool,
      setColor(value) {
        color = value;
      },
      getColor: () => color,
      setSize(value) {
        size = value;
      },
      setTool(next) {
        tool = next === "eraser" ? "eraser" : "pencil";
        applyToolStyles();
      },
      resize() {
        const snapshot = hasStrokes ? canvas.toDataURL("image/png") : null;
        ({ ctx, w, h } = setupCanvas(canvas));
        clearCanvas();
        applyToolStyles();
        if (snapshot) return loadImage(snapshot);
        return Promise.resolve();
      },
    };
  }

  function setupToolbar(prefix, pad, hooks = {}) {
    if (!pad) return;

    const pencilBtn = document.getElementById(`${prefix}DrawPencil`);
    const eraserBtn = document.getElementById(`${prefix}DrawEraser`);
    const colorInput = document.getElementById(`${prefix}DrawColor`);
    const sizeEl = document.getElementById(`${prefix}DrawSize`);
    const clearBtn = document.getElementById(`${prefix}DrawClear`);
    const colorWrap = document.getElementById(`${prefix}DrawColorWrap`);

    function setActiveTool(next) {
      pad.setTool(next);
      pencilBtn?.classList.toggle("is-active", next === "pencil");
      eraserBtn?.classList.toggle("is-active", next === "eraser");
      colorWrap?.classList.toggle("is-disabled", next === "eraser");
      if (colorInput) colorInput.disabled = next === "eraser";
    }

    pencilBtn?.addEventListener("click", () => setActiveTool("pencil"));
    eraserBtn?.addEventListener("click", () => setActiveTool("eraser"));

    if (colorInput) {
      colorInput.value = pad.getColor();
      colorInput.addEventListener("input", () => {
        pad.setColor(colorInput.value);
        setActiveTool("pencil");
      });
    }

    sizeEl?.addEventListener("input", () => {
      pad.setSize(Number(sizeEl.value) || 4);
    });
    pad.setSize(Number(sizeEl?.value) || 4);

    clearBtn?.addEventListener("click", () => {
      pad.clear();
      hooks.onClear?.();
    });

    setActiveTool("pencil");
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.noteDraw = {
    DEFAULT_COLOR,
    createPad,
    setupToolbar,
  };
})();
