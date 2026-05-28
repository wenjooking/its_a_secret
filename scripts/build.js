const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");

const copyFiles = ["index.html", "festival.html", "login.html", "style.css"];
const copyDirs = ["js", "festivals", "assets", "config"];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of copyFiles) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(publicDir, file));
  }
}

for (const dir of copyDirs) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(publicDir, dir), { recursive: true });
  }
}

console.log("Built static site → public/");
