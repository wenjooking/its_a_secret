/* Home hub — lists all festivals from manifest */
(function () {
  const grid = document.getElementById("festivalGrid");
  const siteTitle = document.getElementById("siteTitle");
  const siteSubtitle = document.getElementById("siteSubtitle");

  function festivalHref(id) {
    return `festival.html?id=${encodeURIComponent(id)}`;
  }

  /** DD/MM/YYYY → YYYY-MM-DD for the time element's datetime attribute */
  function formatDateForDatetime(display) {
    const parts = display.split("/");
    if (parts.length !== 3) return display;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function createCard(festival) {
    const isReady = festival.status === "ready";
    const el = document.createElement(isReady ? "a" : "article");
    el.className = `festival-card${isReady ? "" : " festival-card--soon"}`;

    if (isReady) {
      el.href = festivalHref(festival.id);
      el.setAttribute("aria-label", `Open ${festival.title}`);
    } else {
      el.setAttribute("aria-disabled", "true");
    }

    const dateHtml = festival.date
      ? `<time class="festival-card__date" datetime="${formatDateForDatetime(festival.date)}">${festival.date}</time>`
      : "";

    el.innerHTML = `
      <span class="festival-card__emoji" aria-hidden="true">${festival.emoji}</span>
      <h2 class="festival-card__title">${festival.title}</h2>
      <p class="festival-card__tagline">${festival.tagline}</p>
      <div class="festival-card__footer">
        <span class="festival-card__badge">${isReady ? "View" : "Soon"}</span>
        ${dateHtml}
      </div>
    `;

    return el;
  }

  async function init() {
    try {
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
