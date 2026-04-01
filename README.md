# 📍 Location Share

Compartí y recibí ubicaciones de forma **transparente y con consentimiento**.

## ¿Qué hace?

1. Vos creás una solicitud desde tu PC
2. Copiás el link y lo enviás por WhatsApp
3. La persona abre el link, ve una explicación clara de qué se le pide
4. Si acepta, su ubicación aparece en tu panel
5. La ubicación se comparte **una sola vez** — sin rastreo continuo

## Cómo desplegarlo

### Opción 1: Render (gratis)

1. Subí este proyecto a un repositorio en GitHub
2. Andá a [render.com](https://render.com) y creá una cuenta
3. Hacé click en **New → Web Service**
4. Conectá tu repo de GitHub
5. Configurá:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click en **Deploy**
7. Te va a dar una URL tipo `https://tu-app.onrender.com`

### Opción 2: Railway (gratis)

1. Subí a GitHub
2. Andá a [railway.app](https://railway.app)
3. **New Project → Deploy from GitHub repo**
4. Listo — te da una URL automáticamente

### Opción 3: Correrlo local

```bash
npm install
npm start
# Abrí http://localhost:3000
```

Para que sea accesible desde afuera (para compartir por WhatsApp),
podés usar [ngrok](https://ngrok.com):

```bash
npx ngrok http 3000
# Te da una URL pública temporal
```

## Estructura

```
location-share/
├── server.js          ← Servidor Express con API
├── package.json
├── README.md
└── public/
    ├── index.html     ← Panel del creador
    └── share.html     ← Página del receptor (con consentimiento)
```

## Notas

- Las sesiones se guardan en memoria y expiran en 24 horas
- Para uso en producción, reemplazá el store en memoria por una base de datos (Redis, SQLite, etc.)
- La app requiere HTTPS para que funcione el GPS en el navegador (los servicios de hosting lo incluyen automáticamente)
