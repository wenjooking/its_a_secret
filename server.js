const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const viewsPath = path.join(ROOT, "data", "views.json");
const authPath = path.join(ROOT, "config", "auth.json");
const manifestPath = path.join(ROOT, "festivals", "manifest.json");
const notesPath = path.join(ROOT, "data", "notes.json");
const notesAssetsDir = path.join(ROOT, "assets", "notes");
const NOTE_COLORS = new Set([
  "pink",
  "blush",
  "rose",
  "coral",
  "peach",
  "cream",
  "lemon",
  "mint",
  "sage",
  "sky",
  "lavender",
  "lilac",
]);
const NOTE_FONTS = new Set([
  "caveat",
  "patrick",
  "satisfy",
  "dmsans",
  "merriweather",
  "playfair",
  "noto-sans-sc",
  "noto-serif-sc",
  "ma-shan-zheng",
  "zcool-xiaowei",
]);
const NOTE_PINS = new Set(["red", "gold", "blue", "pink", "green", "silver"]);
const MAX_NOTE_IMAGE_BYTES = 3 * 1024 * 1024;

function hashPasscode(passcode) {
  return crypto.createHash("sha256").update(passcode).digest("hex");
}

function readAuth() {
  return JSON.parse(fs.readFileSync(authPath, "utf8"));
}

function writeAuth(data) {
  fs.writeFileSync(authPath, JSON.stringify(data, null, 2) + "\n");
}

function readViews() {
  try {
    return JSON.parse(fs.readFileSync(viewsPath, "utf8"));
  } catch {
    return {};
  }
}

function incrementView(id) {
  const views = readViews();
  views[id] = (views[id] || 0) + 1;
  fs.mkdirSync(path.dirname(viewsPath), { recursive: true });
  fs.writeFileSync(viewsPath, JSON.stringify(views, null, 2) + "\n");
  return views;
}

app.use(express.json({ limit: "5mb" }));

app.get("/api/views", (_req, res) => {
  res.json(readViews());
});

app.post("/api/views/:id", (req, res) => {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "Missing festival id" });
    return;
  }
  res.json(incrementView(id));
});

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(data) {
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2) + "\n");
}

function sanitizeFestival(raw, { requireId } = {}) {
  const id = String(raw.id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  if (requireId && !id) return null;

  const title = String(raw.title || "").trim();
  if (!title) return null;

  const status = raw.status === "ready" ? "ready" : "coming-soon";
  const date = String(raw.date || "").trim();
  const dateOk = !date || /^\d{2}\/\d{2}\/\d{4}$/.test(date);

  if (!dateOk) return null;

  const festival = {
    id: id || slugFromTitle(title),
    title,
    tagline: String(raw.tagline || "").trim(),
    emoji: String(raw.emoji || "✦").trim() || "✦",
    status,
    updatedAt: String(raw.updatedAt || "").trim() || todayIso(),
  };

  if (date) festival.date = date;

  const author = String(raw.author || "").trim();
  if (author) festival.author = author;

  return festival;
}

function sanitizeTimelineEntry(raw) {
  const entry = sanitizeFestival(raw, { requireId: true });
  if (!entry) return null;
  delete entry.status;
  return entry;
}

function sanitizeEntryList(items, sanitize, label) {
  const cleaned = [];
  const ids = new Set();

  for (const item of items) {
    const row = sanitize(item);
    if (!row) {
      return { error: `Each ${label} needs a title and valid date (DD/MM/YYYY).` };
    }
    if (ids.has(row.id)) {
      return { error: `Duplicate id: ${row.id}` };
    }
    ids.add(row.id);
    cleaned.push(row);
  }

  return { cleaned };
}

function slugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

app.get("/api/manifest", (_req, res) => {
  try {
    res.json(readManifest());
  } catch {
    res.status(500).json({ error: "Could not read manifest." });
  }
});

function readNotes() {
  try {
    const data = JSON.parse(fs.readFileSync(notesPath, "utf8"));
    return Array.isArray(data.notes) ? data.notes : [];
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  fs.mkdirSync(path.dirname(notesPath), { recursive: true });
  fs.writeFileSync(notesPath, JSON.stringify({ notes }, null, 2) + "\n");
}

function mimeToExt(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[String(mime || "").toLowerCase()] || null;
}

function deleteNoteImage(imagePath) {
  if (!imagePath || !/^notes\/[a-zA-Z0-9_.-]+$/.test(imagePath)) return;
  const full = path.join(ROOT, "assets", imagePath);
  try {
    fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}

function sanitizeNote(raw) {
  const id = String(raw.id || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .slice(0, 64);
  const body = String(raw.body || "").trim();
  const image = String(raw.image || "").trim();
  if (!id || (!body && !image)) return null;
  if (body.length > 500) return null;
  if (image && !/^notes\/[a-zA-Z0-9_.-]+$/.test(image)) return null;

  const author = String(raw.author || "").trim().slice(0, 40) || "Us";
  let createdAt = String(raw.createdAt || "").trim();
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    createdAt = new Date().toISOString();
  }

  const color = NOTE_COLORS.has(raw.color) ? raw.color : "pink";
  const font = NOTE_FONTS.has(raw.font) ? raw.font : "caveat";
  const note = { id, author, body, createdAt, color, font };
  if (image) note.image = image;

  const x = clampNoteCoord(raw.x, 0, 8000);
  const y = clampNoteCoord(raw.y, 0, 8000);
  const rotation = clampNoteCoord(raw.rotation, -18, 18);
  if (x !== undefined) note.x = x;
  if (y !== undefined) note.y = y;
  if (rotation !== undefined) note.rotation = rotation;

  const pin = String(raw.pin || "").trim();
  if (
    pin &&
    (NOTE_PINS.has(pin) || /^file-\d{1,2}$/.test(pin))
  ) {
    note.pin = pin;
  }

  return note;
}

function clampNoteCoord(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(Math.max(min, Math.min(max, n)));
}

app.get("/api/notes", (_req, res) => {
  try {
    res.json({ notes: readNotes() });
  } catch {
    res.status(500).json({ error: "Could not read notes." });
  }
});

app.post("/api/notes/upload", (req, res) => {
  const noteId = String(req.body?.noteId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  const dataUrl = String(req.body?.dataUrl || "");

  if (!noteId || !dataUrl) {
    res.status(400).json({ error: "Missing image data." });
    return;
  }

  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i);
  if (!match) {
    res.status(400).json({ error: "Use a JPEG, PNG, WebP, or GIF image." });
    return;
  }

  const ext = mimeToExt(match[1]);
  if (!ext) {
    res.status(400).json({ error: "Unsupported image type." });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    res.status(400).json({ error: "Invalid image data." });
    return;
  }

  if (!buffer.length || buffer.length > MAX_NOTE_IMAGE_BYTES) {
    res.status(400).json({ error: "Image must be under 3 MB." });
    return;
  }

  try {
    fs.mkdirSync(notesAssetsDir, { recursive: true });
    const filename = `${noteId}.${ext}`;
    fs.writeFileSync(path.join(notesAssetsDir, filename), buffer);
    res.json({ ok: true, image: `notes/${filename}` });
  } catch {
    res.status(500).json({ error: "Could not save image." });
  }
});

app.put("/api/notes", (req, res) => {
  const raw = Array.isArray(req.body?.notes) ? req.body.notes : null;
  if (!raw) {
    res.status(400).json({ error: "Invalid notes." });
    return;
  }

  const previous = readNotes();
  const cleaned = [];
  const ids = new Set();

  for (const item of raw) {
    const note = sanitizeNote(item);
    if (!note) {
      res.status(400).json({
        error: "Each note needs text or a photo (max 500 characters).",
      });
      return;
    }
    if (ids.has(note.id)) {
      res.status(400).json({ error: `Duplicate note id: ${note.id}` });
      return;
    }
    ids.add(note.id);
    cleaned.push(note);
  }

  cleaned.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  try {
    writeNotes(cleaned);
    previous
      .filter((p) => !cleaned.some((c) => c.id === p.id))
      .forEach((n) => deleteNoteImage(n.image));
    res.json({ ok: true, notes: cleaned });
  } catch {
    res.status(500).json({ error: "Could not save notes." });
  }
});

app.put("/api/manifest", (req, res) => {
  const body = req.body || {};
  const existing = readManifest();
  const hasTimeline = Array.isArray(body.timeline);
  const hasFestivals = Array.isArray(body.festivals);

  if (!hasTimeline && !hasFestivals) {
    res.status(400).json({ error: "Invalid manifest." });
    return;
  }

  const timelineSource = hasTimeline
    ? body.timeline
    : existing.timeline || existing.festivals || [];
  const festivalsSource = hasFestivals ? body.festivals : existing.festivals || [];

  const timelineResult = sanitizeEntryList(
    timelineSource,
    sanitizeTimelineEntry,
    "timeline entry"
  );
  if (timelineResult.error) {
    res.status(400).json({ error: timelineResult.error });
    return;
  }

  const festivalsResult = sanitizeEntryList(
    festivalsSource,
    (item) => sanitizeFestival(item, { requireId: true }),
    "moment"
  );
  if (festivalsResult.error) {
    res.status(400).json({ error: festivalsResult.error });
    return;
  }

  const manifest = {
    siteTitle: String(body.siteTitle || existing.siteTitle || "🐻 & 🐰").trim(),
    siteSubtitle: String(body.siteSubtitle || existing.siteSubtitle || "").trim(),
    timeline: timelineResult.cleaned,
    festivals: festivalsResult.cleaned,
  };

  try {
    writeManifest(manifest);
    res.json({ ok: true, manifest });
  } catch {
    res.status(500).json({ error: "Could not save manifest." });
  }
});

app.post("/api/auth/change-passcode", (req, res) => {
  const { currentPasscode, newPasscode } = req.body || {};
  const digit8 = /^\d{8}$/;

  if (!digit8.test(currentPasscode) || !digit8.test(newPasscode)) {
    res.status(400).json({ error: "Passcode must be 8 digits." });
    return;
  }

  if (currentPasscode === newPasscode) {
    res.status(400).json({ error: "New passcode must be different." });
    return;
  }

  try {
    const auth = readAuth();
    if (hashPasscode(currentPasscode) !== auth.passwordHash) {
      res.status(401).json({ error: "Current passcode is wrong." });
      return;
    }

    auth.passwordHash = hashPasscode(newPasscode);
    writeAuth(auth);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Could not save new passcode." });
  }
});

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`For You ♡ — http://localhost:${PORT}`);
});
