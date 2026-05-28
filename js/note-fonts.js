/* Shared note fonts — used by notes.js and server allowlist */
(function () {
  const NOTE_FONTS = [
    {
      id: "caveat",
      label: "Handwriting",
      family: '"Caveat", cursive',
      size: "1.5rem",
      weight: "500",
    },
    {
      id: "patrick",
      label: "Casual",
      family: '"Patrick Hand", cursive',
      size: "1.25rem",
      weight: "400",
    },
    {
      id: "satisfy",
      label: "Script",
      family: '"Satisfy", cursive',
      size: "1.35rem",
      weight: "400",
    },
    {
      id: "dmsans",
      label: "Simple",
      family: "var(--font)",
      size: "1rem",
      weight: "500",
    },
    {
      id: "merriweather",
      label: "Classic",
      family: '"Merriweather", Georgia, serif',
      size: "1.05rem",
      weight: "400",
    },
    {
      id: "playfair",
      label: "Elegant",
      family: '"Playfair Display", Georgia, serif',
      size: "1.15rem",
      weight: "500",
    },
    {
      id: "noto-sans-sc",
      label: "简体",
      family: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      size: "1.05rem",
      weight: "500",
    },
    {
      id: "noto-serif-sc",
      label: "宋体",
      family: '"Noto Serif SC", "Songti SC", "SimSun", serif',
      size: "1.05rem",
      weight: "400",
    },
    {
      id: "ma-shan-zheng",
      label: "毛笔",
      family: '"Ma Shan Zheng", "KaiTi", cursive',
      size: "1.35rem",
      weight: "400",
    },
    {
      id: "zcool-xiaowei",
      label: "清秀",
      family: '"ZCOOL XiaoWei", "STKaiti", serif',
      size: "1.2rem",
      weight: "400",
    },
  ];

  function applyToElement(el, fontId) {
    if (!el) return;
    const font = NOTE_FONTS.find((f) => f.id === fontId) || NOTE_FONTS[0];
    el.style.fontFamily = font.family;
    el.style.fontSize = font.size;
    el.style.fontWeight = font.weight;
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.noteFonts = {
    list: NOTE_FONTS,
    ids: NOTE_FONTS.map((f) => f.id),
    isValid(id) {
      return NOTE_FONTS.some((f) => f.id === id);
    },
    defaultId: "caveat",
    applyToElement,
  };
})();
