# Guida al Deploy e Distribuzione di Zoodex 🚀

Questa guida illustra passo per passo come rendere Zoodex indipendente dal PC locale:
1. **Deploy del Backend Cloud (Hugging Face Spaces / Docker)**
2. **Creazione dell'APK Standalone per Android (senza Expo Go)**
3. **Integrazione del nuovo modello YOLO addestrato (`best.pt`)**
4. **Analisi dei limiti e costi di Hugging Face Spaces**

---

## 1. Architettura Attuale: Dove vive YOLO?

**Sì, attualmente YOLO vive ed esegue l'inferenza interamente nel Backend (`backend/app/services/detector.py`).**

### Flusso di Scansione:
```
[Smartphone (Pixel 8a)]
        │
        ▼ (Scatta fotocamera su richiesta)
  Cattura frame JPEG ──(Base64 JSON via HTTP)──► [Backend FastAPI Cloud]
                                                      │
                                                      ▼ (YOLO11 Segmentazione)
                                               Inference su CPU/GPU:
                                               - Poligoni vettoriali dei contorni
                                               - Bounding box
                                               - Riconoscimento specie
                                                      │
  Overlay SVG contorni ◄──(JSON Detections)───────────┘
  + Card Bioespandibile
  + Chiusura e sblocco manuale
```

- **Pesi attivi di default nel backend:** `yolo11n-seg.pt` (modello preaddestrato COCO con 80 classi).
- **Nuovo modello in addestramento:** `yolo11m-seg.pt` su dataset `lvis.yaml` (1.203 categorie ad alta risoluzione).

---

## 2. Deploy del Backend nel Cloud (Hugging Face Spaces)

Hugging Face Spaces permette di ospitare container Docker gratuitamente in modo permanente con un URL HTTPS pubblico.

### Passaggi per Hugging Face Spaces:
1. **Crea uno Space su Hugging Face:**
   - Vai su [huggingface.co/spaces](https://huggingface.co/spaces) -> **Create new Space**.
   - **Space SDK**: seleziona **Docker** (Blank).
   - **Space Hardware**: seleziona **CPU basic (2 vCPU · 16 GB · Free)** o una GPU T4 a consumo se desideri inferenza a 40ms.
   - Visibilità: **Public** o **Private**.

2. **File del Backend pronti nel repository:**
   Il backend include già il `Dockerfile` ottimizzato (`EXPOSE 7860`, `libglib2.0-0`, `python 3.12-slim`).

3. **Carica il Backend sullo Space:**
   Puoi sincronizzare direttamente la cartella `backend` tramite Git sullo Space Hugging Face:
   ```bash
   git remote add hf https://huggingface.co/spaces/<tuo-username>/<tuo-space-name>
   git subtree push --prefix backend hf main
   ```
   Oppure crea il repo Space e copia i file di `backend/` (`Dockerfile`, `requirements.txt`, `app/`).

4. **URL del Backend:**
   Una volta avviato il container, il tuo backend sarà accessibile pubblicamente via HTTPS su:
   `https://<tuo-username>-<tuo-space-name>.hf.space`

---

## 3. Limiti dello Spazio su Hugging Face Spaces

| Risorsa | Piano Free (Gratuito) | Piano GPU (Paid / Crediti) |
|---|---|---|
| **CPU** | 2 vCPU | Fino a 8 vCPU |
| **RAM** | 16 GB | 30 GB - 60 GB |
| **Storage Disco** | 50 GB gratuiti | 50 GB espandibile |
| **Costo** | **0€ (Gratis sempre)** | A partire da ~$0.60/ora (T4 GPU) |
| **Tempo di Inferenza YOLO11n** | ~250 - 500 ms per immagine | ~20 - 45 ms per immagine |
| **Sleep / Ibernazione** | Va in pausa dopo 48h di inattività (si risveglia in ~15-20s alla prima richiesta) | Possibilità di mantenerlo sempre attivo |

> [!NOTE]
> Per un uso interattivo (dove l'utente preme "SCANSIONA" e attende mezzo secondo per visualizzare i contorni), il **tier Free (2 vCPU · 16 GB)** è più che sufficiente!

---

## 4. Creazione dell'App Mobile Standalone (Senza Expo Go)

Per installare Zoodex sul tuo Google Pixel 8a come applicazione nativa indipendente (`.apk` con icona e splash screen personalizzati):

### Passaggi con EAS Build (Expo Application Services):
1. **Accedi o Registrati a Expo:**
   ```bash
   cd mobile
   npx eas-cli login
   ```

2. **Configura l'URL del tuo Backend Cloud:**
   Nel file `mobile/.env.production` (oppure nei segreti EAS):
   ```bash
   EXPO_PUBLIC_BACKEND_URL=https://<tuo-username>-<tuo-space-name>.hf.space
   ```

3. **Avvia la compilazione dell'APK nel Cloud:**
   Il file `mobile/eas.json` è già preconfigurato con il profilo `preview` impostato su `buildType: "apk"`:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
   - EAS compila l'applicazione sui server cloud dedicati di Expo.
   - Al termine (circa 5-10 minuti), ti verrà fornito un **link diretto per scaricare il file `.apk`** e un QR code.
   - Apri il link dal tuo Pixel 8a, installa l'APK e l'app sarà installata sul tuo telefono con la nuova icona!

---

## 5. Come usare il Nuovo Modello Addestrato (`best.pt`)

Quando il processo di fine-tuning su `lvis.yaml` giunge al termine:
1. I pesi salvati si troveranno in:
   `runs/segment/zoodex_runs/zoodex_seg_custom-2/weights/best.pt`
2. **Sostituzione nel backend:**
   Copia il file `best.pt` nella cartella pesi o sovrascrivi `yolo11n-seg.pt` (oppure imposta la variabile d'ambiente `ZOODEX_MODEL_PATH=weights/best.pt`).
3. **Ricarica a caldo:**
   Puoi effettuare una chiamata `POST /api/v1/reload-model?model_path=weights/best.pt` senza nemmeno dover riavviare il server!
