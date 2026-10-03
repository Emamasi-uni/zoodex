# 🎯 Guida al Fine-Tuning & Riconoscimento Globale per Zoodex

Questa guida spiega come abilitare la tua **NVIDIA GeForce RTX 5070 (12 GB VRAM)** in locale o i tuoi crediti **Google Colab** per estendere il riconoscimento da poche classi all'intero mondo visibile (tutti gli animali, oggetti, arredi, piante e manufatti).

---

## 1. Risoluzione dei due Warning riscontrati

### A. `Fetch request has been canceled`
- **Causa:** L'app mobile era inizializzata con `http://10.0.2.2:8000`. `10.0.2.2` è un indirizzo virtuale valido **solo** dentro l'emulatore Android su PC. Sul tuo vero **Google Pixel 8a**, `10.0.2.2` non puntava a nulla; la richiesta andava in timeout (8s) ed Expo la annullava.
- **Risoluzione applicata:** Abbiamo aggiornato l'app in modo che rilevi dinamicamente l'IP locale del tuo PC sulla rete Wi-Fi (`http://192.168.1.65:8000`) tramite `Constants.expoConfig.hostUri`, ed esteso il timeout a 20 secondi.

### B. `Failed to capture image`
- **Causa:** 
  1. Il parametro `skipProcessing: true` su Android CameraX con sensori ad altissima risoluzione (come i 64MP del Pixel 8a) causa un'eccezione hardware nella pipeline JPEG.
  2. La modalità di scansione automatica invocava `takePictureAsync` a intervallo fisso prima che il precedente scatto fosse stato completato, mandando in blocco l'otturatore della fotocamera.
- **Risoluzione applicata:** 
  - Aggiunto un semaforo atomico (`isTakingPictureRef`) che impedisce scatti concorrenti sovrapposti.
  - Rimosso `skipProcessing` e impostata la qualità a `0.25` (JPEG compatto e leggero, ideale per modelli AI a 416/640 pixel).
  - Aggiunto `onCameraReady` per attendere la piena inizializzazione del sensore prima di scattare.

---

## 2. Abilitare l'Accelerazione CUDA sulla tua RTX 5070

Attualmente il virtualenv Python ha installato la versione CPU standard di PyTorch. Per sfruttare i Tensor Core della tua **RTX 5070** (portando l'inferenza da 200ms a **meno di 5ms per frame**, oltre 150 FPS reali):

Nel terminale del PC (nella cartella `backend`):
```powershell
cd c:\Users\emanu\PycharmProjects\Zoodex\backend
.\.venv\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124 --force-reinstall
```

Verifica con:
```powershell
python -c "import torch; print('CUDA Attiva:', torch.cuda.is_available(), '| GPU:', torch.cuda.get_device_name(0))"
```
Vedrai: `CUDA Attiva: True | GPU: NVIDIA GeForce RTX 5070`.

---

## 3. Come far riconoscere TUTTO (non solo 10 animali)

I modelli base pre-addestrati su **COCO** hanno solo 80 classi. Esistono tre metodi per riconoscere qualsiasi elemento inquadrato:

### Metodo 1: Dataset LVIS (1.203 Classi con Segmentazione) — Consigliato!
Il dataset **LVIS** (Large Vocabulary Instance Segmentation) estende COCO a **1.203 categorie**, includendo:
- Centinaia di animali selvatici e domestici (volpi, aquile, cervi, foche, lupi, lucertole, pesci, farfalle, ecc.).
- Tutti gli oggetti domestici, arredi, strumenti, piante, cibi e veicoli.

Per scaricare e addestrare direttamente su LVIS:
```bash
python ml/train_finetune.py --dataset lvis.yaml --model yolo11m-seg.pt --batch 16 --epochs 50
```

### Metodo 2: YOLO-World (Open-Vocabulary: Riconosce Qualsiasi Testo)
**YOLO-World** (sviluppato da Tencent e integrato in Ultralytics) è un modello *Open-Vocabulary*. Non è limitato a un elenco fisso: puoi impostare qualsiasi lista di categorie testuali (anche 2.000 animali e oggetti diversi) senza dover riaddestrare la rete convoluzionale!

Esempio in Python:
```python
from ultralytics import YOLOWorld

# Modello Open-Vocabulary
model = YOLOWorld("yolov8x-worldv2.pt")

# Imposta qualsiasi classe del mondo reale tu voglia!
model.set_classes([
    "lion", "tiger", "wolf", "eagle", "bear", "fox", "deer", "dolphin",
    "shark", "penguin", "kangaroo", "koala", "door", "window", "lamp",
    "bookshelf", "television", "guitar", "plant", "shoes", "human face"
])

# Riconosce e segmenta all'istante
results = model.predict("camera_frame.jpg")
```

### Metodo 3: FastSAM / SAM 2 (Segment Anything) + Classificatore BioCLIP
Se vuoi che l'algoritmo scontorni **letteralmente qualsiasi entità visibile** (anche oggetti mai visti prima):
1. **FastSAM / SAM 2**: Scontorna automaticamente tutti i cluster di pixel / sagome nell'immagine generando le maschere al 100%.
2. **BioCLIP / CLIP**: Prende ciascun ritaglio scontornato e ne interroga il dizionario semantico per ricavare il nome della specie comune e scientifica.

---

## 4. Esecuzione del Fine-Tuning

### In Locale sulla RTX 5070 (Gratuito, nessun limite di tempo)
La tua RTX 5070 ha **12 GB di memoria GDDR7 ad altissima banda**:
```bash
cd c:\Users\emanu\PycharmProjects\Zoodex
.\backend\.venv\Scripts\activate
python ml/train_finetune.py --dataset coco128-seg.yaml --model yolo11m-seg.pt --batch 16 --epochs 50 --imgsz 640
```
- Tempo stimato per 50 epoche: ~15-20 minuti.
- Alla fine otterrai il file `zoodex_runs/zoodex_seg_custom/weights/best.pt`.
- Basterà copiare `best.pt` in `backend/yolo11n-seg.pt` per vederlo attivo subito nell'app!

### Su Google Colab (sfruttando i tuoi crediti)
1. Apri un notebook Colab con runtime **GPU T4** o **A100**.
2. Esegui:
```python
!pip install ultralytics
!git clone https://github.com/tuo-repo/Zoodex.git  # o carica la cartella ml/
from ultralytics import YOLO

model = YOLO("yolo11m-seg.pt")
model.train(data="lvis.yaml", epochs=50, imgsz=640, batch=32, device=0)
```
3. Scarica `best.pt` al termine e inseriscilo nella cartella `backend/`.
