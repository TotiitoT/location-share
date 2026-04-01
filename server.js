const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.created > 86400000) sessions.delete(id);
  }
}, 3600000);

// Create session
app.post("/api/session", (req, res) => {
  const id = crypto.randomBytes(4).toString("hex");
  sessions.set(id, {
    id,
    created: Date.now(),
    points: [],
    active: false,
    stopped: false,
  });
  res.json({ id, url: `/s/${id}` });
});

// Get session (creator polls)
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  res.json({
    id: session.id,
    active: session.active,
    stopped: session.stopped,
    openedAt: session.openedAt || null,
    pointCount: session.points.length,
    points: session.points,
  });
});

// Add location point
app.post("/api/location/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  if (session.stopped) return res.status(400).json({ error: "Sesión detenida" });

  const { lat, lng, accuracy } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  session.active = true;
  session.points.push({
    lat, lng,
    accuracy: accuracy || null,
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// Stop tracking
app.post("/api/stop/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  session.active = false;
  session.stopped = true;
  res.json({ ok: true });
});

// Serve recipient page
app.get("/s/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).send("Link no válido o expirado.");
  if (!session.openedAt) {
    session.openedAt = new Date().toISOString();
  }
  res.sendFile(path.join(__dirname, "public", "share.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✓ Location Share corriendo en http://localhost:${PORT}`);
});
