const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const viewsPath = path.join(ROOT, "data", "views.json");

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

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`For You ♡ — http://localhost:${PORT}`);
});
