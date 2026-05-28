/* Shared note board colors — used by notes.js and server allowlist */
(function () {
  const NOTE_COLORS = [
    { id: "pink", label: "Pink" },
    { id: "blush", label: "Blush" },
    { id: "rose", label: "Rose" },
    { id: "coral", label: "Coral" },
    { id: "peach", label: "Peach" },
    { id: "cream", label: "Cream" },
    { id: "lemon", label: "Lemon" },
    { id: "mint", label: "Mint" },
    { id: "sage", label: "Sage" },
    { id: "sky", label: "Sky" },
    { id: "lavender", label: "Lavender" },
    { id: "lilac", label: "Lilac" },
  ];

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.noteColors = {
    list: NOTE_COLORS,
    ids: NOTE_COLORS.map((c) => c.id),
    isValid(id) {
      return NOTE_COLORS.some((c) => c.id === id);
    },
    defaultId: "pink",
  };
})();
