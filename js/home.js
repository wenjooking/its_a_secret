/* Home hub — lists all festivals from manifest */
(function () {
  const grid = document.getElementById("festivalGrid");
  const siteTitle = document.getElementById("siteTitle");
  const siteSubtitle = document.getElementById("siteSubtitle");
  const VIEWS_STORAGE_KEY = "couple_festival_views";

  let viewCounts = {};

  function festivalHref(id) {
    return `festival.html?id=${encodeURIComponent(id)}`;
  }

  function formatDateForDatetime(display) {
    const parts = display.split("/");
    if (parts.length !== 3) return display;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function loadLocalViews() {
    try {
      return JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveLocalViews(views) {
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
  }

  async function loadViews() {
    try {
      const res = await fetch("/api/views");
      if (res.ok) {
        const data = await res.json();
        saveLocalViews(data);
        return data;
      }
    } catch {
      /* static host or offline */
    }

    try {
      const res = await fetch("data/views.json");
      if (res.ok) {
        const fileData = await res.json();
        const local = loadLocalViews();
        const merged = { ...fileData, ...local };
        return merged;
      }
    } catch {
      /* ignore */
    }

    return loadLocalViews();
  }

  async function recordView(id) {
    try {
      const res = await fetch(`/api/views/${encodeURIComponent(id)}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        viewCounts = data;
        saveLocalViews(data);
        return data[id] ?? 0;
      }
    } catch {
      /* fallback */
    }

    viewCounts[id] = (viewCounts[id] || 0) + 1;
    saveLocalViews(viewCounts);
    return viewCounts[id];
  }

  function eyeIcon() {
    return `<svg class="festival-card__eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`;
  }

  function viewsHtml(id) {
    const count = viewCounts[id] ?? 0;
    return `<span class="festival-card__views" title="Views">
      ${eyeIcon()}
      <span class="festival-card__views-count" data-festival-id="${id}">${count}</span>
    </span>`;
  }

  function updateCardViews(el, id, count) {
    const countEl = el.querySelector(`[data-festival-id="${id}"]`);
    if (countEl) countEl.textContent = String(count);
  }

  function createCard(festival) {
    const isReady = festival.status === "ready";
    const el = document.createElement(isReady ? "a" : "article");
    el.className = `festival-card${isReady ? "" : " festival-card--soon"}`;
    el.dataset.festivalId = festival.id;

    if (isReady) {
      el.href = festivalHref(festival.id);
      el.setAttribute("aria-label", `Open ${festival.title}`);
    } else {
      el.setAttribute("aria-disabled", "true");
    }

    const dateHtml = festival.date
      ? `<time class="festival-card__date" datetime="${formatDateForDatetime(festival.date)}">${festival.date}</time>`
      : "";

    const authorHtml = festival.author
      ? `<p class="festival-card__author">by ${festival.author}</p>`
      : "";

    el.innerHTML = `
      <div class="festival-card__top">
        <span class="festival-card__emoji" aria-hidden="true">${festival.emoji}</span>
        ${dateHtml}
      </div>
      <h2 class="festival-card__title">${festival.title}</h2>
      ${authorHtml}
      <p class="festival-card__tagline">${festival.tagline}</p>
      <div class="festival-card__bottom">
        <span class="festival-card__badge">${isReady ? "View" : "Soon"}</span>
        ${viewsHtml(festival.id)}
      </div>
    `;

    if (isReady) {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        const href = el.href;
        const count = await recordView(festival.id);
        updateCardViews(el, festival.id, count);
        window.location.href = href;
      });
    }

    return el;
  }

  async function init() {
    try {
      viewCounts = await loadViews();

      const res = await fetch("festivals/manifest.json");
      if (!res.ok) throw new Error("manifest");
      const data = await res.json();

      siteTitle.textContent = data.siteTitle;
      siteSubtitle.textContent = data.siteSubtitle;
      document.title = data.siteTitle;

      grid.replaceChildren();
      data.festivals.forEach((f) => grid.appendChild(createCard(f)));
    } catch {
      siteSubtitle.textContent = "Could not load moments. Refresh to try again.";
    }
  }

  document.getElementById("signOut")?.addEventListener("click", () => {
    window.CoupleApp?.auth?.signOut();
  });

  init();
})();
