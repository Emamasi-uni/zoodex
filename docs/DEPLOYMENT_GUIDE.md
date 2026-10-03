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

## 2. Deploy del Backend nel Cloud (Opzioni Gratuite al 100% Senza Carta)

> [!WARNING]
> Hugging Face ha recentemente modificato la propria politica: sia gli Space Docker che gli Space Gradio Compute richiedono ora la sottoscrizione **PRO** o carta di credito registrata. Gli Space "Static / Gradio Lite" rimangono gratuiti ma **non possono eseguire Python né PyTorch**.
> Di seguito trovi le due migliori alternative cloud **100% gratuite e prive di carta di credito**:

### Opzione A: Render.com (Web Service Cloud Permanente — Raccomandato)

Render si collega direttamente al tuo repository GitHub `https://github.com/Emamasi-uni/zoodex.git` e crea un Web Service cloud permanente:
1. Registrati gratis su [render.com](https://render.com) (usando il tuo account GitHub, nessuna carta richiesta).
2. Clicca su **New +** -> **Web Service** -> Collega il tuo repository `zoodex`.
3. Compila i campi:
   - **Name**: `zoodex-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements-render.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free (0$/mese)**
4. Clicca su **Create Web Service**.
5. Render compilerà il backend ed assegnerà un URL HTTPS pubblico tipo:  
   `https://zoodex-backend.onrender.com`
   *(I file `render.yaml` e `backend/requirements-render.txt` sono già inclusi nel repository per ottimizzare RAM e build).*

---

### Opzione B: Google Colab con GPU Gratuita T4 + Cloudflare Tunnel

Se desideri inferenza fulminea (30ms) grazie a una **GPU NVIDIA T4 gratuita da 16 GB VRAM** offerta da Google:
1. Abbiamo creato il notebook dedicato: [ml/colab_cloud_backend.ipynb](ml/colab_cloud_backend.ipynb).
2. Caricalo su [colab.research.google.com](https://colab.research.google.com).
3. Vai su **Runtime** -> **Modifica tipo di runtime** -> Seleziona **T4 GPU** (Gratuito).
4. Clicca su **Runtime** -> **Esegui tutto**.
5. Il notebook scarica il backend, avvia FastAPI con accelerazione GPU e tramite Cloudflare Tunnel genera un URL HTTPS pubblico sicuro come:  
   `https://zoodex-ai-xxxx.trycloudflare.com`
6. Inserisci quell'URL nell'app Zoodex e avrai la massima velocità possibile senza spendere un centesimo!

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
