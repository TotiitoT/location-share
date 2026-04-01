const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

// Clean sessions older than 48h
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.created > 172800000) sessions.delete(id);
  }
}, 3600000);

// Create session
app.post("/api/session", (req, res) => {
  const id = crypto.randomBytes(4).toString("hex");
  sessions.set(id, {
    id,
    created: Date.now(),
    createdAt: new Date().toISOString(),
    points: [],
    active: false,
    stopped: false,
    openedAt: null,
    termsAcceptedAt: null,
    photo: null,
    photoAt: null,
  });
  res.json({ id, url: `/s/${id}` });
});

// List all sessions (creator history)
app.get("/api/sessions", (req, res) => {
  const list = [];
  for (const [id, s] of sessions) {
    list.push({
      id: s.id,
      createdAt: s.createdAt,
      openedAt: s.openedAt,
      termsAcceptedAt: s.termsAcceptedAt,
      active: s.active,
      stopped: s.stopped,
      pointCount: s.points.length,
      hasPhoto: !!s.photo,
      photoAt: s.photoAt,
      lastPoint: s.points.length > 0 ? s.points[s.points.length - 1] : null,
    });
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// Get session
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  res.json({
    id: session.id,
    createdAt: session.createdAt,
    active: session.active,
    stopped: session.stopped,
    openedAt: session.openedAt,
    termsAcceptedAt: session.termsAcceptedAt,
    pointCount: session.points.length,
    points: session.points,
    hasPhoto: !!session.photo,
    photoAt: session.photoAt,
  });
});

// Get photo
app.get("/api/photo/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session || !session.photo) return res.status(404).json({ error: "Sin foto" });
  res.json({ photo: session.photo, photoAt: session.photoAt });
});

// Record terms accepted
app.post("/api/terms/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  session.termsAcceptedAt = new Date().toISOString();
  res.json({ ok: true });
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
  session.points.push({ lat, lng, accuracy: accuracy || null, timestamp: new Date().toISOString() });
  res.json({ ok: true });
});

// Upload photo
app.post("/api/photo/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });

  const { photo } = req.body;
  if (!photo) return res.status(400).json({ error: "Sin imagen" });

  session.photo = photo;
  session.photoAt = new Date().toISOString();
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
  if (!session.openedAt) session.openedAt = new Date().toISOString();
  res.sendFile(path.join(__dirname, "public", "share.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✓ Location Share corriendo en http://localhost:${PORT}`);
});
