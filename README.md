# 🔴 Zoodex — Pokédex degli Animali Reali

> **Zoodex** è un'applicazione mobile ispirata all'iconico Pokédex di Pokémon, progettata per identificare, scontornare e catalogare gli animali reali del pianeta divisi per continente.

---

## 📸 Caratteristiche Principali

- **Object Detection & Segmentazione (Scontornamento)**:
  - Rileva e scontorna in tempo reale qualsiasi entità inquadrata dalla fotocamera (animali, oggetti domestici, flora).
  - Genera poligoni vettoriali SVG ad alta precisione con tracciamento neon e bounding box a reticolo Pokédex.
  - Modello AI basato su **YOLO Segmentation (Ultralytics YOLO11/YOLOv8-seg)** con fallback computer vision OpenCV per garantire affidabilità al 100%.
- **Design Autentico in Stile Pokédex**:
  - Scocca rossa (`#DC0A2D`), grande lente blu a sensore luminoso con riflesso vitreo, 3 LED di stato (Rosso, Giallo lampeggiante in scansione, Verde online).
  - Schermi LCD con griglie retrofuturistiche, pulsanti direzionali (D-Pad) e tasto rotondo centrale di scansione.
- **Catalogo per Continenti**:
  - Navigazione attraverso i 6 continenti: **Europa, Africa, Asia, Americhe, Oceania, Antartide**.
  - Animali bloccati visualizzati come **silhouette misteriose nere con `?`**.
  - Ogni scansione riuscita sblocca l'animale nel Dex con scheda dettagliata (Nome scientifico, Altezza, Peso, Rarità, Habitat e Descrizione biografica).
- **Ottimizzazione Batteria (Google Pixel 8a)**:
  - Modalità **Risparmio Energetico (ECO)** integrata.
  - Scansione on-demand con freeze frame e visualizzazione contorni SVG interattivi.
  - Funziona sia con server locale/cloud, sia con modalità simulatore offline per test rapidi ovunque.

📖 Per tutti i dettagli su deploy in cloud (Hugging Face Spaces), limiti gratuiti e compilazione dell'APK standalone, consulta la [Guida al Deploy](docs/DEPLOYMENT_GUIDE.md).

---

## 🚀 Come Avviare il Progetto

### 1. Avviare il Backend (FastAPI + YOLO)

Sul tuo computer:
```bash
# Oppure fai doppio clic su run_backend.bat
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Il server sarà accessibile su `http://0.0.0.0:8000` (e raggiungibile dal tuo Pixel 8a via Wi-Fi tramite l'indirizzo IP locale del PC, es. `http://192.168.1.X:8000`).

Per verificare che tutto funzioni:
```bash
cd backend
.\.venv\Scripts\python -m pytest -v
```

---

### 2. Avviare l'App Mobile sul Pixel 8a

Hai due modalità semplicissime:

#### Modalità A — Con Expo Go (Immediata, senza installare nulla)
1. Installa l'app gratuita **Expo Go** dal Google Play Store sul tuo Pixel 8a.
2. Sul PC, avvia:
   ```bash
   # Oppure fai doppio clic su run_mobile.bat
   cd mobile
   npx expo start
   ```
3. Inquadra il **QR Code** apparso nel terminale con l'app Expo Go: l'app si aprirà istantaneamente sul tuo Pixel 8a!

#### Modalità B — Generazione dell'APK Standalone (Installabile direttamente)
Grazie alla configurazione `eas.json` già pronta e collegata al tuo account Expo:
```bash
cd mobile
npx eas-cli@latest build -p android --profile preview
```
EAS compilerà l'APK nei server cloud gratuiti di Expo e ti fornirà un link/QR per scaricare il file `.apk` direttamente sul telefono.

---

### 3. Deploy Gratuito in Cloud (Hugging Face Spaces)

Per far girare il backend in cloud a costo **zero** (senza tenere il PC acceso):
1. Crea un account gratuito su [huggingface.co](https://huggingface.co).
2. Crea un nuovo **Space**, seleziona **Docker** come SDK (il `Dockerfile` pronto è già presente nella cartella `backend/Dockerfile`).
3. Carica i file della cartella `backend/` nello Space.
4. Hugging Face assegnerà automaticamente un URL HTTPS gratuito (es. `https://tuo-username-zoodex.hf.space`).
5. Apri l'app Zoodex sul telefono, tocca l'icona ingranaggio ⚙️ e inserisci l'URL!
