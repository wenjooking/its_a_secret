/* Animated heart — used on festival pages */
window.CoupleApp = window.CoupleApp || {};

(function (app) {
  const { viewport } = app;

  let heartColor = "#FF99CC";
  let bgParticles = [];
  let heart = null;
  let animationId = null;

  function setHeartColor(color) {
    heartColor = color;
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function createBackgroundParticles() {
    const { width, height } = viewport.getViewSize();
    bgParticles = [];

    for (let i = 0; i < 120; i++) {
      bgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.3 + 0.05,
        flicker: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackgroundParticles(ctx) {
    const { width, height } = viewport.getViewSize();

    bgParticles.forEach((p) => {
      p.y += p.speed;
      p.flicker += 0.04;

      if (p.y > height) {
        p.y = 0;
        p.x = Math.random() * width;
      }

      const glow = p.alpha + Math.sin(p.flicker) * 0.25;
      ctx.globalAlpha = Math.max(0.1, glow);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function heartFunction(t, shrinkRatio = viewport.getHeartScale()) {
    const { width, height } = viewport.getViewSize();
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );

    x *= shrinkRatio;
    y *= shrinkRatio;
    x += width / 2;
    y += height / 2;

    return [Math.floor(x), Math.floor(y)];
  }

  function scatterInside(x, y, beta = 0.15) {
    const { width, height } = viewport.getViewSize();
    const cx = width / 2;
    const cy = height / 2;
    const ratioX = -beta * Math.log(Math.random());
    const ratioY = -beta * Math.log(Math.random());
    const dx = ratioX * (x - cx);
    const dy = ratioY * (y - cy);
    return [x - dx, y - dy];
  }

  function shrinkPoint(x, y, ratio) {
    const { width, height } = viewport.getViewSize();
    const cx = width / 2;
    const cy = height / 2;
    const force = -1 / Math.pow((x - cx) ** 2 + (y - cy) ** 2, 0.6);
    const dx = ratio * force * (x - cx);
    const dy = ratio * force * (y - cy);
    return [x - dx, y - dy];
  }

  function curve(p) {
    return (2 * (2 * Math.sin(4 * p))) / (2 * Math.PI);
  }

  function calcPosition(x, y, ratio) {
    const { width, height } = viewport.getViewSize();
    const cx = width / 2;
    const cy = height / 2;
    const force = 1 / Math.pow((x - cx) ** 2 + (y - cy) ** 2, 0.52);
    const dx = ratio * force * (x - cx) + rand(-1, 1);
    const dy = ratio * force * (y - cy) + rand(-1, 1);
    return [x - dx, y - dy];
  }

  class Heart {
    constructor(generateFrame = 20) {
      this._points = new Set();
      this._edgeDiffusionPoints = new Set();
      this._centerDiffusionPoints = new Set();
      this.allPoints = {};
      this.generateFrame = generateFrame;
      this.startTime = performance.now();
      this.build(2000);

      for (let f = 0; f < generateFrame; f++) {
        this.calc(f);
      }
    }

    key(x, y) {
      return `${Math.floor(x)},${Math.floor(y)}`;
    }

    parse(k) {
      return k.split(",").map(Number);
    }

    build(number) {
      for (let i = 0; i < number; i++) {
        const t = Math.random() * 2 * Math.PI;
        const [x, y] = heartFunction(t);
        this._points.add(this.key(x, y));
      }

      Array.from(this._points).forEach((k) => {
        const [x, y] = this.parse(k);
        for (let i = 0; i < 3; i++) {
          const [nx, ny] = scatterInside(x, y, 0.05);
          this._edgeDiffusionPoints.add(this.key(nx, ny));
        }
      });

      const list = Array.from(this._points).map((k) => this.parse(k));
      for (let i = 0; i < 4000; i++) {
        const [x, y] = choice(list);
        const [nx, ny] = scatterInside(x, y, 0.17);
        this._centerDiffusionPoints.add(this.key(nx, ny));
      }
    }

    calc(frame) {
      const ratio = 10 * curve((frame / 10) * Math.PI);
      const haloRadius = Math.floor(4 + 6 * (1 + curve((frame / 10) * Math.PI)));
      const haloNumber = Math.floor(
        3000 + 4000 * Math.abs(curve((frame / 10) * Math.PI) ** 2)
      );

      const allPoints = [];
      const haloSet = new Set();

      for (let i = 0; i < haloNumber; i++) {
        const t = Math.random() * 2 * Math.PI;
        let [x, y] = heartFunction(t, viewport.getHeartScale() * 1.05);
        [x, y] = shrinkPoint(x, y, haloRadius);
        const k = this.key(x, y);

        if (!haloSet.has(k)) {
          haloSet.add(k);
          x += rand(-14, 14);
          y += rand(-14, 14);
          allPoints.push([x, y, choice([1, 2, 2])]);
        }
      }

      Array.from(this._points).forEach((k) => {
        let [x, y] = this.parse(k);
        [x, y] = calcPosition(x, y, ratio);
        allPoints.push([x, y, rand(1, 3)]);
      });

      Array.from(this._edgeDiffusionPoints).forEach((k) => {
        let [x, y] = this.parse(k);
        [x, y] = calcPosition(x, y, ratio);
        allPoints.push([x, y, rand(1, 2)]);
      });

      Array.from(this._centerDiffusionPoints).forEach((k) => {
        let [x, y] = this.parse(k);
        [x, y] = calcPosition(x, y, ratio);
        allPoints.push([x, y, rand(1, 2)]);
      });

      this.allPoints[frame] = allPoints;
    }

    render(frame, ctx) {
      const { width, height } = viewport.getViewSize();
      ctx.clearRect(0, 0, width, height);
      drawBackgroundParticles(ctx);

      const points = this.allPoints[frame % this.generateFrame];
      const time = performance.now() * 0.002;
      const elapsed = (performance.now() - this.startTime) / 1000;
      const t = Math.min(1, elapsed / 2);
      const introScale = 0.3 + (1 - 0.3) * (1 - Math.pow(1 - t, 3));
      const heartbeat = 1 + Math.sin(time * 2.2) * 0.04;
      const pulse = introScale * heartbeat;
      const glow = 0.85 + Math.sin(time * 1.8) * 0.15;
      const cx = width / 2;
      const cy = height / 2;

      ctx.fillStyle = heartColor;
      points.forEach(([x, y, size]) => {
        const px = cx + (x - cx) * pulse;
        const py = cy + (y - cy) * pulse;
        const driftX = Math.sin(time + x * 0.01) * 0.4;
        const driftY = Math.cos(time + y * 0.01) * 0.4;
        ctx.globalAlpha = glow;
        ctx.fillRect(px + driftX, py + driftY, size, size);
      });

      ctx.globalAlpha = 1;
    }
  }

  function drawLoop(frame = 0) {
    const ctx = viewport.getContext();
    if (!heart || !ctx) return;

    heart.render(frame, ctx);
    setTimeout(() => {
      animationId = requestAnimationFrame(() => drawLoop(frame + 1));
    }, 160);
  }

  function start() {
    createBackgroundParticles();
    heart = new Heart();
    drawLoop();
  }

  function rebuild() {
    createBackgroundParticles();
    heart = new Heart();
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  viewport.onResize(() => {
    if (heart) rebuild();
  });

  app.heart = {
    setHeartColor,
    start,
    rebuild,
    stop,
  };
})(window.CoupleApp);
