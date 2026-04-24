const playBtn = document.getElementById("playBtn");
const music = document.getElementById("music");
const record = document.getElementById("record");

playBtn.addEventListener("click", () => {
  music.play();
  record.classList.add("playing");
  playBtn.textContent = "正在播放 ♡";
  createHeartFirework();
});

// love fireworks
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let particles = [];

function createHeartFirework() {
  particles = [];

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2.5;

  for (let i = 0; i < 180; i++) {
    const t = Math.random() * Math.PI * 2;

    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      -(13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t));

    particles.push({
      x: centerX,
      y: centerY,
      targetX: centerX + x * 13,
      targetY: centerY + y * 13,
      alpha: 1,
      size: Math.random() * 3 + 2,
      color: `hsl(${330 + Math.random() * 30}, 100%, 70%)`
    });
  }

  animateFirework();
}

function animateFirework() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.x += (p.targetX - p.x) * 0.06;
    p.y += (p.targetY - p.y) * 0.06;
    p.alpha -= 0.004;

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  particles = particles.filter((p) => p.alpha > 0);

  if (particles.length > 0) {
    requestAnimationFrame(animateFirework);
  }
}

const letters = document.querySelectorAll(".letter");

function revealLetters() {
  const trigger = window.innerHeight * 0.85;

  letters.forEach((el) => {
    const top = el.getBoundingClientRect().top;

    if (top < trigger) {
      el.classList.add("show");
    }
  });
}

window.addEventListener("scroll", revealLetters);