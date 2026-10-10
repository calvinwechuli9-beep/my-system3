require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_SEARCH = 20;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(require("./routes/auth.routes"));
app.use(require("./routes/records.routes"));
app.use(require("./routes/admin.routes"));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Request failed:", err);
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ error: "Files must be 4 MB or smaller." });
  if (err.message === "Upload a PDF or image file.")
    return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "The request could not be completed." });
});

function startServer(port, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`LandTrust LRMS running at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempt < MAX_PORT_SEARCH) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attempt + 1);
      return;
    }
    throw err;
  });
}

if (require.main === module) startServer(DEFAULT_PORT);

module.exports = app;
