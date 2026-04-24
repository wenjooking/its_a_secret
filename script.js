// ===== DOM =====
const introCard = document.getElementById("introCard");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const hint = document.getElementById("hint");
const music = document.getElementById("music");

const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");

let started = false;

// ===== 常量 =====
const IMAGE_ENLARGE = 13;
const HEART_COLOR = "#FF99CC";

// ===== 画布 =====
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ===== 工具函数 =====
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 背景粒子 =====
let bgParticles = [];
let letterParticles = [];

function createBackgroundParticles() {
  bgParticles = [];
  for (let i = 0; i < 120; i++) {
    bgParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.3 + 0.05,
      flicker: Math.random() * Math.PI * 2
    });
  }
}

function createLetterParticles() {
  const section = document.querySelector(".letter-section");
  const rect = section.getBoundingClientRect();

  letterParticles = [];

  for (let i = 0; i < 90; i++) {
    letterParticles.push({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      size: Math.random() * 1.3 + 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.25 + 0.05,
      flicker: Math.random() * Math.PI * 2
    });
  }
}

function drawBackgroundParticles() {
  bgParticles.forEach((p) => {
    p.y += p.speed;
    p.flicker += 0.04;

    if (p.y > canvas.height) {
      p.y = 0;
      p.x = Math.random() * canvas.width;
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

function drawLetterParticles() {
  const section = document.querySelector(".letter-section");
  const rect = section.getBoundingClientRect();

  letterParticles.forEach((p) => {
    p.y += p.speed;
    p.flicker += 0.03;

    if (p.y > rect.height) {
      p.y = 0;
      p.x = Math.random() * rect.width;
    }

    const glow = p.alpha + Math.sin(p.flicker) * 0.2;

    ctx.globalAlpha = Math.max(0.1, glow);
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      p.x,
      p.y + rect.top,
      p.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

// ===== 爱心数学 =====
function heart_function(t, shrink_ratio = IMAGE_ENLARGE) {
  let x = 16 * Math.pow(Math.sin(t), 3);
  let y = -(
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  );

  x *= shrink_ratio;
  y *= shrink_ratio;

  x += canvas.width / 2;
  y += canvas.height / 2;

  return [Math.floor(x), Math.floor(y)];
}

function scatter_inside(x, y, beta = 0.15) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const ratio_x = -beta * Math.log(Math.random());
  const ratio_y = -beta * Math.log(Math.random());

  return [
    x - ratio_x * (x - cx),
    y - ratio_y * (y - cy)
  ];
}

function shrink(x, y, ratio) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const force =
    -1 / Math.pow((x - cx) ** 2 + (y - cy) ** 2, 0.6);

  return [
    x - ratio * force * (x - cx),
    y - ratio * force * (y - cy)
  ];
}

function curve(p) {
  return (2 * (2 * Math.sin(4 * p))) / (2 * Math.PI);
}

function calc_position(x, y, ratio) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const force =
    1 / Math.pow((x - cx) ** 2 + (y - cy) ** 2, 0.52);

  return [
    x - (ratio * force * (x - cx) + rand(-1, 1)),
    y - (ratio * force * (y - cy) + rand(-1, 1))
  ];
}

// ===== Heart 类 =====
class Heart {
  constructor(generate_frame = 20) {
    this._points = new Set();
    this._edge_diffusion_points = new Set();
    this._center_diffusion_points = new Set();
    this.all_points = {};
    this.generate_frame = generate_frame;
    this.startTime = performance.now();

    this.build(2000);

    for (let f = 0; f < generate_frame; f++) {
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
      const [x, y] = heart_function(t);
      this._points.add(this.key(x, y));
    }

    Array.from(this._points).forEach((k) => {
      const [x, y] = this.parse(k);
      for (let i = 0; i < 3; i++) {
        const [nx, ny] = scatter_inside(x, y, 0.05);
        this._edge_diffusion_points.add(this.key(nx, ny));
      }
    });

    const list = Array.from(this._points).map(k => this.parse(k));

    for (let i = 0; i < 4000; i++) {
      const [x, y] = choice(list);
      const [nx, ny] = scatter_inside(x, y, 0.17);
      this._center_diffusion_points.add(this.key(nx, ny));
    }
  }

  calc(frame) {
    const ratio = 10 * curve((frame / 10) * Math.PI);
    const halo_radius = Math.floor(
      4 + 6 * (1 + curve((frame / 10) * Math.PI))
    );
    const halo_number = Math.floor(
      3000 + 4000 * Math.abs(curve((frame / 10) * Math.PI) ** 2)
    );

    const all_points = [];
    const halo_set = new Set();

    for (let i = 0; i < halo_number; i++) {
      const t = Math.random() * 2 * Math.PI;
      let [x, y] = heart_function(t, 13.6);
      [x, y] = shrink(x, y, halo_radius);

      const k = this.key(x, y);

      if (!halo_set.has(k)) {
        halo_set.add(k);
        x += rand(-14, 14);
        y += rand(-14, 14);
        all_points.push([x, y, choice([1, 2, 2])]);
      }
    }

    [...this._points].forEach(k => {
      let [x, y] = this.parse(k);
      [x, y] = calc_position(x, y, ratio);
      all_points.push([x, y, rand(1, 3)]);
    });

    [...this._edge_diffusion_points].forEach(k => {
      let [x, y] = this.parse(k);
      [x, y] = calc_position(x, y, ratio);
      all_points.push([x, y, rand(1, 2)]);
    });

    [...this._center_diffusion_points].forEach(k => {
      let [x, y] = this.parse(k);
      [x, y] = calc_position(x, y, ratio);
      all_points.push([x, y, rand(1, 2)]);
    });

    this.all_points[frame] = all_points;
  }

  render(frame) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackgroundParticles();
    drawLetterParticles();

    const points = this.all_points[frame % this.generate_frame];

    const time = performance.now() * 0.002;
    const elapsed = (performance.now() - this.startTime) / 1000;

    const t = Math.min(1, elapsed / 2);
    const introScale = 0.3 + (1 - 0.3) * (1 - Math.pow(1 - t, 3));

    const heartbeat = 1 + Math.sin(time * 2.2) * 0.04;
    const pulse = introScale * heartbeat;

    const glow = 0.85 + Math.sin(time * 1.8) * 0.15;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scrollOffset = window.scrollY;

    ctx.fillStyle = HEART_COLOR;

    points.forEach(([x, y, size]) => {
      const px = cx + (x - cx) * pulse;
      const py = cy + (y - cy) * pulse;

      const driftX = Math.sin(time + x * 0.01) * 0.4;
      const driftY = Math.cos(time + y * 0.01) * 0.4;

      ctx.globalAlpha = glow;

      ctx.fillRect(
        px + driftX,
        py + driftY - scrollOffset,
        size,
        size
      );
    });

    ctx.globalAlpha = 1;
  }
}

// ===== 动画 =====
let heart;

function draw(frame = 0) {
  heart.render(frame);

  setTimeout(() => {
    requestAnimationFrame(() => draw(frame + 1));
  }, 160);
}

// ===== 交互 =====
yesBtn.addEventListener("click", async () => {
  if (started) return;
  started = true;

  introCard.classList.add("hide");
  hint.classList.add("show");

  await music.play();

  createBackgroundParticles();
  createLetterParticles();
  heart = new Heart();
  draw();
});

noBtn.addEventListener("click", () => {
  noBtn.textContent = "Try Yes ♡";
});

// ===== 信件滑动 =====
const letters = document.querySelectorAll(".letter");

function revealLetters() {
  const trigger = window.innerHeight * 0.85;

  letters.forEach((el) => {
    if (el.getBoundingClientRect().top < trigger) {
      el.classList.add("show");
    }
  });
}

window.addEventListener("scroll", revealLetters);