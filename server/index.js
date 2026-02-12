import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const LIGA_URL =
  process.env.LIGA_URL ??
  "https://www.ligavistahermosaf7.futbol/index.php?op=GRUPO&idcomp=227";

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "web")));

// Simple proxy: fetch HTML server-side to avoid browser CORS
app.get("/api/group", async (_req, res) => {
  try {
    const r = await fetch(LIGA_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (LigaWebScraper/1.0)" },
    });
    if (!r.ok) return res.status(502).json({ error: `HTTP ${r.status}` });

    const html = await r.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "web", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ http://localhost:${port}`));
