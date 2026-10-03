# ==============================================================================
# ZOODEX: ADDESTRAMENTO SU GOOGLE COLAB (GPU T4 / A100)
# ==============================================================================
# Istruzioni per l'uso su Colab:
# 1. Apri Google Colab (https://colab.research.google.com)
# 2. Modifica > Impostazioni blocco note > Acceleratore hardware: scegli GPU (T4 o A100)
# 3. Incolla ed esegui i comandi seguenti in una cella di codice.
# ==============================================================================

# Cella 1: Installazione Ultralytics
!pip install ultralytics

# Cella 2: Verifica GPU assegnata
import torch
print("GPU Attiva:", torch.cuda.get_device_name(0))
print("VRAM Disponibile:", round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2), "GB")

# Cella 3: Addestramento Segmentazione LVIS (1.203 Classi: animali + oggetti)
from ultralytics import YOLO

# Carica i pesi pre-addestrati di base (puoi scegliere yolo11m-seg.pt o yolo11x-seg.pt)
model = YOLO("yolo11m-seg.pt")

# Avvia l'addestramento: scaricherà e allenerà sul dataset LVIS
results = model.train(
    data="lvis.yaml",
    epochs=50,
    imgsz=640,
    batch=32,            # Su A100 puoi usare anche 32 o 64
    device=0,
    amp=True,
    workers=8,
    save=True,
    project="zoodex_colab",
    name="zoodex_lvis_model",
)

# Cella 4: Download del modello finale addestrato
from google.colab import files
files.download("zoodex_colab/zoodex_lvis_model/weights/best.pt")
print("Download avviato! Salva il file come 'yolo11n-seg.pt' dentro la cartella backend di Zoodex.")
