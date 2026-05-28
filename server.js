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

app.use(express.json());

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
