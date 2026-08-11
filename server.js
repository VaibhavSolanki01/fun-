// Serves the static site in /public. Playback itself runs in the
// browser via YouTube's IFrame API (see public/js/app.js) — this
// server has no other job.

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8888;

app.use(express.static(path.join(__dirname, "docs")));

app.listen(PORT, () => {
  console.log(`Bus Driver running at http://localhost:${PORT}`);
});
