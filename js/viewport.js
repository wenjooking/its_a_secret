/* Shared viewport + canvas sizing for festival pages */
window.CoupleApp = window.CoupleApp || {};

(function (app) {
  let viewW = 0;
  let viewH = 0;
  let canvas = null;
  let ctx = null;
  const resizeListeners = [];

  function setAppHeight() {
    const height = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }

  function getViewSize() {
    return { width: viewW, height: viewH };
  }

  function getHeartScale() {
    const minDim = Math.min(viewW, viewH);
    return Math.max(5, Math.min(14, minDim * 0.0175));
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const hero = canvas.parentElement;
    viewW = hero?.clientWidth || window.innerWidth;
    viewH = hero?.clientHeight || window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resizeListeners.forEach((fn) => fn());
  }

  function onViewportChange() {
    setAppHeight();
    resizeCanvas();
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    setAppHeight();
    resizeCanvas();

    window.addEventListener("load", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
  }

  function onResize(fn) {
    resizeListeners.push(fn);
  }

  app.viewport = {
    init,
    onResize,
    setAppHeight,
    getViewSize,
    getHeartScale,
    getCanvas: () => canvas,
    getContext: () => ctx,
  };
})(window.CoupleApp);
