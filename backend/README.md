---
title: Zoodex AI Backend
emoji: 🐾
colorFrom: red
colorTo: blue
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---

# 🐾 Zoodex AI Vision Backend

Backend cloud per l'applicazione **Zoodex**, ispirata al Pokédex per l'identificazione, segmentazione e catalogazione della fauna reale per continente.

## Endpoints API

- `POST /api/v1/scan-json` — Riceve l'immagine in Base64 ed esegue inferenza YOLO, restituendo poligoni SVG di scontornamento e classe.
- `GET /health` — Health check del server.
- `GET /api/v1/continents` — Ritorna i continenti e lo stato di avanzamento delle scoperte.
- `GET /api/v1/animals` — Catalogo completo di animali e silhouette bloccate.
- `POST /api/v1/unlock` — Conferma e salva lo sblocco di un animale nel Dex.

Tutti gli endpoint REST sono esposti e accessibili direttamente sia dall'app mobile che via HTTP.
