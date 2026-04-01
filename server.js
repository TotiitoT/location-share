const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "sessions.json");

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- Persistent storage ---
let sessions = {};

function save(){
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(sessions)); } catch(e){}
}

function load(){
  try {
    if(fs.existsSync(DATA_FILE)){
      sessions = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch(e){ sessions = {}; }
}

load();

// --- Routes ---

app.post("/api/session", (req, res) => {
  const id = crypto.randomBytes(4).toString("hex");
  sessions[id] = {
    id, created: Date.now(), createdAt: new Date().toISOString(),
    points: [], active: false, stopped: false,
    openedAt: null, termsAcceptedAt: null, photo: null, photoAt: null,
  };
  save();
  res.json({ id });
});

app.get("/api/sessions", (req, res) => {
  const list = Object.values(sessions).map(s => ({
    id:s.id, createdAt:s.createdAt, openedAt:s.openedAt,
    termsAcceptedAt:s.termsAcceptedAt, active:s.active, stopped:s.stopped,
    pointCount:s.points.length, hasPhoto:!!s.photo, photoAt:s.photoAt,
    lastPoint: s.points.length>0 ? s.points[s.points.length-1] : null,
  }));
  list.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  res.json(list);
});

app.get("/api/session/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).json({error:"No encontrada"});
  res.json({
    id:s.id, createdAt:s.createdAt, active:s.active, stopped:s.stopped,
    openedAt:s.openedAt, termsAcceptedAt:s.termsAcceptedAt,
    pointCount:s.points.length, points:s.points,
    hasPhoto:!!s.photo, photoAt:s.photoAt,
  });
});

app.get("/api/photo/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s||!s.photo) return res.status(404).json({error:"Sin foto"});
  res.json({ photo:s.photo, photoAt:s.photoAt });
});

app.post("/api/terms/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).json({error:"No encontrada"});
  s.termsAcceptedAt = new Date().toISOString();
  save();
  res.json({ ok:true });
});

app.post("/api/location/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).json({error:"No encontrada"});
  if(s.stopped) return res.status(400).json({error:"Detenida"});
  const {lat,lng,accuracy} = req.body;
  if(typeof lat!=="number"||typeof lng!=="number") return res.status(400).json({error:"Inválido"});
  s.active = true;
  s.points.push({lat,lng,accuracy:accuracy||null,timestamp:new Date().toISOString()});
  save();
  res.json({ ok:true });
});

app.post("/api/photo/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).json({error:"No encontrada"});
  if(!req.body.photo) return res.status(400).json({error:"Sin imagen"});
  s.photo = req.body.photo;
  s.photoAt = new Date().toISOString();
  save();
  res.json({ ok:true });
});

app.post("/api/stop/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).json({error:"No encontrada"});
  s.active = false;
  s.stopped = true;
  save();
  res.json({ ok:true });
});

app.delete("/api/session/:id", (req, res) => {
  if(!sessions[req.params.id]) return res.status(404).json({error:"No encontrada"});
  delete sessions[req.params.id];
  save();
  res.json({ ok:true });
});

app.delete("/api/sessions", (req, res) => {
  sessions = {};
  save();
  res.json({ ok:true });
});

app.get("/s/:id", (req, res) => {
  const s = sessions[req.params.id];
  if(!s) return res.status(404).send("Link no válido o expirado.");
  if(!s.openedAt){ s.openedAt = new Date().toISOString(); save(); }
  res.sendFile(path.join(__dirname, "public", "share.html"));
});

app.get("/", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT, () => console.log("Location Share en puerto " + PORT));
