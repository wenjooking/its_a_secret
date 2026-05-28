/* Top-right menu: arrow reveals theme + settings */
(function () {
  const menu = document.getElementById("actionMenu");
  const toggle = document.getElementById("actionMenuToggle");
  if (!menu || !toggle) return;

  function setOpen(open) {
    menu.classList.toggle("action-menu--open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("action-menu--open"));
  });

  menu.querySelectorAll(".action-menu__extras a").forEach((el) => {
    el.addEventListener("click", () => close());
  });

  document.getElementById("themeToggle")?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("action-menu--open")) return;
    if (!menu.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
