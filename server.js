const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── In-memory store (for production, use a database) ───
const sessions = new Map();

// Clean old sessions every hour (> 24h)
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.created > 86400000) sessions.delete(id);
  }
}, 3600000);

// ─── API Routes ───

// Create session
app.post("/api/session", (req, res) => {
  const id = crypto.randomBytes(4).toString("hex");
  sessions.set(id, {
    id,
    created: Date.now(),
    location: null,
  });
  res.json({ id, url: `/s/${id}` });
});

// Get session (creator polls this)
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  res.json({
    id: session.id,
    hasLocation: !!session.location,
    location: session.location,
  });
});

// Store location (recipient sends this)
app.post("/api/location/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  if (session.location) return res.status(400).json({ error: "Ubicación ya compartida" });

  const { lat, lng, accuracy } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  session.location = {
    lat,
    lng,
    accuracy: accuracy || null,
    timestamp: new Date().toISOString(),
  };
  res.json({ ok: true });
});

// Serve recipient page
app.get("/s/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).send("Link no válido o expirado.");
  res.sendFile(path.join(__dirname, "public", "share.html"));
});

// Serve creator page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✓ Location Share corriendo en http://localhost:${PORT}`);
});
