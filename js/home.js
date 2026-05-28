/* Home hub — timeline, festival cards, views */
(function () {
  const grid = document.getElementById("festivalGrid");
  const timelineList = document.getElementById("timelineList");
  const siteTitle = document.getElementById("siteTitle");
  const siteSubtitle = document.getElementById("siteSubtitle");

  let viewCounts = {};

  function festivalHref(id) {
    return `festival.html?id=${encodeURIComponent(id)}`;
  }

  function parseDisplayDate(display) {
    const parts = display?.split("/");
    if (!parts || parts.length !== 3) return null;
    const [day, month, year] = parts.map((p) => parseInt(p, 10));
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  function formatDateForDatetime(display) {
    const d = parseDisplayDate(display);
    if (!d) return display || "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatTimelineDate(display) {
    const d = parseDisplayDate(display);
    if (!d) return display || "";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /** @returns {{ text: string, offset: number } | null} offset: negative = past, positive = future */
  function relativeDaysLabel(display) {
    const d = parseDisplayDate(display);
    if (!d) return null;

    const today = startOfDay(new Date());
    const target = startOfDay(d);
    const days = Math.round((target - today) / (24 * 60 * 60 * 1000));

    if (days === 0) return { text: "Today", offset: 0 };
    if (days === 1) return { text: "1 day to go", offset: 1 };
    if (days === -1) return { text: "1 day ago", offset: -1 };
    if (days > 1) return { text: `${days} days to go`, offset: days };
    return { text: `${Math.abs(days)} days ago`, offset: days };
  }

  function relativeModifier(offset) {
    if (offset < 0) return "ago";
    if (offset > 0) return "togo";
    return "today";
  }

  function dateLabelHtml(festival, className, format) {
    if (!festival.date) return "";
    const label =
      format === "raw" ? festival.date : formatTimelineDate(festival.date);
    return `<time class="${className}" datetime="${formatDateForDatetime(festival.date)}">${label}</time>`;
  }

  function timelineTrailingHtml(festival, isReady) {
    const relative = festival.date ? relativeDaysLabel(festival.date) : null;
    if (relative && relative.offset < 0) {
      return relativeStatusHtml(festival, "timeline__status", "");
    }
    if (!isReady) {
      return relativeStatusHtml(festival, "timeline__status", "Soon");
    }
    return `<span class="timeline__chevron" aria-hidden="true">›</span>`;
  }

  function relativeStatusHtml(festival, className, fallback) {
    const relative = festival.date ? relativeDaysLabel(festival.date) : null;
    if (!relative) {
      return `<span class="${className}">${fallback}</span>`;
    }
    const mod = relativeModifier(relative.offset);
    const title = formatTimelineDate(festival.date);
    return `<span class="${className} ${className}--${mod}" title="${title}">${relative.text}</span>`;
  }

  function sortFestivalsByDate(festivals) {
    return [...festivals].sort((a, b) => {
      const da = parseDisplayDate(a.date);
      const db = parseDisplayDate(b.date);
      if (da && db) return db - da;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
  }

  function isPastFestival(festival) {
    const relative = festival.date ? relativeDaysLabel(festival.date) : null;
    return relative !== null && relative.offset < 0;
  }

  function findNextFestivalId(festivals) {
    const today = startOfDay(new Date());
    let nextId = null;
    let nextDate = null;

    festivals.forEach((f) => {
      const d = parseDisplayDate(f.date);
      if (!d) return;
      const target = startOfDay(d);
      if (target < today) return;
      if (!nextDate || target < nextDate) {
        nextDate = target;
        nextId = f.id;
      }
    });

    return nextId;
  }

  function isNew(festival) {
    return window.CoupleApp?.seen?.isNew(festival) ?? false;
  }

  function newDotHtml() {
    return `<span class="festival-card__new-dot" title="Updated since your last visit" aria-label="New"></span>`;
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
    viewCounts[id] = count;
  }

  function clearNewIndicators(id) {
    document
      .querySelectorAll(
        `.festival-card[data-festival-id="${id}"] .festival-card__new-dot, .timeline__item[data-festival-id="${id}"] .timeline__new-dot`
      )
      .forEach((el) => el.remove());
  }

  function markOpened(festival) {
    if (!festival.updatedAt) return;
    window.CoupleApp.seen.mark(festival.id, festival.updatedAt);
    clearNewIndicators(festival.id);
  }

  function createTimelineItem(festival, nextFestivalId) {
    const isReady = festival.status === "ready";
    const showNew = isNew(festival);
    const isNext = festival.id === nextFestivalId;
    const isPast = isPastFestival(festival);

    const li = document.createElement("li");
    const classes = ["timeline__item"];
    if (isNext) classes.push("timeline__item--next");
    else if (isPast) classes.push("timeline__item--past");
    else if (!isReady) classes.push("timeline__item--soon");
    li.className = classes.join(" ");
    li.dataset.festivalId = festival.id;

    const dateHtml = dateLabelHtml(festival, "timeline__date");

    const inner = isReady
      ? document.createElement("a")
      : document.createElement("div");
    inner.className = "timeline__link";
    if (isReady) {
      inner.href = festivalHref(festival.id);
      inner.setAttribute("aria-label", `Open ${festival.title}`);
    } else {
      inner.setAttribute("aria-disabled", "true");
    }

    inner.innerHTML = `
      <span class="timeline__emoji" aria-hidden="true">${festival.emoji || "✦"}</span>
      <span class="timeline__body">
        ${dateHtml}
        <span class="timeline__title">${festival.title}</span>
        ${festival.tagline ? `<span class="timeline__tagline">${festival.tagline}</span>` : ""}
      </span>
      ${showNew ? `<span class="timeline__new-dot" title="Updated since your last visit" aria-label="New"></span>` : ""}
      ${timelineTrailingHtml(festival, isReady)}
    `;

    if (isReady) {
      inner.addEventListener("click", async (e) => {
        e.preventDefault();
        const href = inner.href;
        markOpened(festival);
        const count = await window.CoupleApp.views.record(festival.id);
        const card = document.querySelector(`.festival-card[data-festival-id="${festival.id}"]`);
        if (card) updateCardViews(card, festival.id, count);
        window.location.href = href;
      });
    }

    li.appendChild(inner);
    return li;
  }

  function createCard(festival) {
    const isReady = festival.status === "ready";
    const showNew = isNew(festival);
    const el = document.createElement(isReady ? "a" : "article");
    el.className = `festival-card${isReady ? "" : " festival-card--soon"}`;
    el.dataset.festivalId = festival.id;

    if (isReady) {
      el.href = festivalHref(festival.id);
      el.setAttribute("aria-label", `Open ${festival.title}`);
    } else {
      el.setAttribute("aria-disabled", "true");
    }

    const dateHtml = dateLabelHtml(festival, "festival-card__date", "raw");

    const authorHtml = festival.author
      ? `<p class="festival-card__author">by ${festival.author}</p>`
      : "";

    el.innerHTML = `
      <div class="festival-card__top">
        <span class="festival-card__emoji" aria-hidden="true">${festival.emoji}</span>
        ${dateHtml}
      </div>
      <h3 class="festival-card__title-row">
        <span class="festival-card__title">${festival.title}</span>
        ${showNew ? newDotHtml() : ""}
      </h3>
      ${authorHtml}
      <p class="festival-card__tagline">${festival.tagline}</p>
      <div class="festival-card__bottom">
        ${isReady ? `<span class="festival-card__badge">View</span>` : relativeStatusHtml(festival, "festival-card__badge", "Soon")}
        ${viewsHtml(festival.id)}
      </div>
    `;

    if (isReady) {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        const href = el.href;
        markOpened(festival);
        const count = await window.CoupleApp.views.record(festival.id);
        updateCardViews(el, festival.id, count);
        window.location.href = href;
      });
    }

    return el;
  }

  function scrollTimelineToNext(nextFestivalId) {
    if (!nextFestivalId) return;
    requestAnimationFrame(() => {
      const item = timelineList.querySelector(
        `[data-festival-id="${nextFestivalId}"]`
      );
      const scroll = item?.closest(".timeline-scroll");
      if (item && scroll) {
        const top =
          item.offsetTop - (scroll.clientHeight - item.offsetHeight) / 2;
        scroll.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    });
  }

  function renderTimeline(festivals) {
    const nextId = findNextFestivalId(festivals);
    timelineList.replaceChildren();
    sortFestivalsByDate(festivals).forEach((f) => {
      timelineList.appendChild(createTimelineItem(f, nextId));
    });
    scrollTimelineToNext(nextId);
  }

  async function init() {
    try {
      await window.CoupleApp.views.init();
      viewCounts = await window.CoupleApp.views.load();

      const res = await fetch("festivals/manifest.json");
      if (!res.ok) throw new Error("manifest");
      const data = await res.json();

      siteTitle.textContent = data.siteTitle;
      siteSubtitle.textContent = data.siteSubtitle;
      document.title = data.siteTitle;

      renderTimeline(data.festivals);

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
