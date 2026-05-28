const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`For You ♡ — http://localhost:${PORT}`);
});
