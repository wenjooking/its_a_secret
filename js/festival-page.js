/* Single festival experience — loads on card click, no intro gate */
(function () {
  const { viewport, heart } = window.CoupleApp;

  const hint = document.getElementById("hint");
  const heroTitle = document.getElementById("heroTitle");
  const music = document.getElementById("music");
  const letterBlock = document.getElementById("letterBlock");
  const letterPlaceholder = document.getElementById("letterPlaceholder");
  const canvas = document.getElementById("fireworks");

  function getFestivalId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id")?.trim() || "";
  }

  function assetUrl(base, file) {
    if (!file) return null;
    return `${base.replace(/\/$/, "")}/${file}`;
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const accent = theme.accent || theme.heartColor;

    root.style.setProperty("--theme-heart", theme.heartColor);
    root.style.setProperty("--theme-accent", accent);
    root.style.setProperty("--theme-bg", theme.background);
    root.style.setProperty(
      "--theme-glow",
      theme.glow || `${accent}33`
    );

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.themeColor || theme.background);

    document.body.style.background = theme.background;
    heart.setHeartColor(theme.heartColor);
  }

  function renderLetterImages(assets, letter) {
    letterBlock.innerHTML = "";
    const images = assets?.images || [];

    if (images.length > 0) {
      letterPlaceholder.classList.add("hidden");
      images.forEach((img) => {
        const wrap = document.createElement("div");
        wrap.className = "letter-frame";
        const el = document.createElement("img");
        el.src = assetUrl(assets.base, img.src);
        el.alt = img.alt || "";
        el.decoding = "async";
        el.loading = "lazy";
        wrap.appendChild(el);
        letterBlock.appendChild(wrap);
      });
      return;
    }

    if (letter.placeholder) {
      letterPlaceholder.textContent = letter.placeholder;
      letterPlaceholder.classList.remove("hidden");
    }
  }

  function setupScrollReveal() {
    const targets = [letterBlock, letterPlaceholder].filter(
      (el) => el && !el.classList.contains("hidden")
    );

    function reveal() {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const trigger = vh * 0.88;

      targets.forEach((el) => {
        if (el.getBoundingClientRect().top < trigger) {
          el.classList.add("show");
        }
      });
    }

    window.addEventListener("scroll", reveal, { passive: true });
    reveal();
  }

  async function loadConfig(id) {
    const res = await fetch(`festivals/${id}.json`);
    if (!res.ok) throw new Error("not_found");
    return res.json();
  }

  function showError(message) {
    document.body.innerHTML = `
      <main class="error-page">
        <h1>${message}</h1>
        <p><a href="index.html">← Back to moments</a></p>
      </main>`;
  }

  function startExperience() {
    hint.classList.add("show");
    heart.start();

    if (music.src) {
      music.play().catch(() => {});
    }
  }

  function applyConfig(data) {
    document.title = data.pageTitle;
    document.getElementById("letterTitle").textContent = data.letter.title;
    document.getElementById("credit").textContent = data.credit;
    heroTitle.textContent = data.letter.title;
    hint.textContent = data.hero?.hint || "Scroll to read ↓";

    applyTheme(data.theme);
    renderLetterImages(data.assets, data.letter);

    const musicFile = data.assets?.music;
    if (musicFile) {
      music.src = assetUrl(data.assets.base, musicFile);
    } else {
      music.removeAttribute("src");
    }
  }

  async function init() {
    const id = getFestivalId();
    if (!id) {
      showError("Pick a moment from the home page.");
      return;
    }

    try {
      const data = await loadConfig(id);
      if (data.status !== "ready") {
        showError("This moment isn’t open yet.");
        return;
      }

      applyConfig(data);
      viewport.init(canvas);
      setupScrollReveal();
      startExperience();
    } catch {
      showError("We couldn’t find that moment.");
    }
  }

  init();
})();
