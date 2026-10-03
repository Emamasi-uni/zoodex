"""Script per il Fine-Tuning e l'Addestramento di YOLO Segmentation
Ottimizzato per NVIDIA GeForce RTX 5070 (12 GB VRAM) o Google Colab GPU (T4 / A100).

Utilizzo:
    python ml/train_finetune.py --dataset lvis --model yolo11x-seg.pt --epochs 50 --batch 16
"""

import argparse
import sys
import torch
from ultralytics import YOLO

def check_hardware():
    print("=" * 60)
    print("   VERIFICA HARDWARE PER IL FINE-TUNING")
    print("=" * 60)
    print(f"Versione Python: {sys.version.split()[0]}")
    print(f"Versione PyTorch: {torch.__version__}")
    
    cuda_ok = torch.cuda.is_available()
    print(f"CUDA Disponibile: {'SI (GPU Rilevata)' if cuda_ok else 'NO (Attenzione: in esecuzione su CPU!)'}")
    
    if cuda_ok:
        device_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"Dispositivo GPU: {device_name}")
        print(f"Memoria VRAM: {vram_gb:.2f} GB")
        if "5070" in device_name:
            print(">>> Rilevata NVIDIA RTX 5070! Perfetta per il training locale con batch 16/32 e FP16.")
    else:
        print("\n[SUGGERIMENTO] Per abilitare la tua RTX 5070 con accelerazione CUDA in locale, esegui:")
        print("pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124\n")
    print("=" * 60)
    return cuda_ok

def train_segmentation(
    dataset_yaml: str = "coco128-seg.yaml",
    model_weights: str = "yolo11m-seg.pt",
    epochs: int = 50,
    batch_size: int = 16,
    imgsz: int = 640,
    device: str = "0",
):
    """Esegue il fine-tuning di un modello di segmentazione delle istanze."""
    print(f"\n[1/3] Caricamento pesi pre-addestrati: {model_weights}...")
    model = YOLO(model_weights)

    print(f"\n[2/3] Avvio addestramento su dataset: {dataset_yaml}")
    print(f"- Epoche: {epochs}")
    print(f"- Dimensione batch: {batch_size}")
    print(f"- Risoluzione immagini: {imgsz}x{imgsz}")
    print(f"- Device: {device}")

    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        workers=4,
        amp=True,          # Automatic Mixed Precision (FP16) per velocizzare sulla 5070
        save=True,
        save_period=5,
        project="zoodex_runs",
        name="zoodex_seg_custom",
    )

    print("\n[3/3] Addestramento completato con successo!")
    print(f"Migliori pesi salvati in: {results.save_dir}/weights/best.pt")
    
    # Validazione automatica delle metriche (mAP50, mAP50-95 mask)
    metrics = model.val()
    print("Metriche Maschere mAP50-95:", metrics.seg.map)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zoodex Model Fine-Tuning")
    parser.add_argument("--dataset", type=str, default="coco8-seg.yaml", help="Path o nome del dataset YAML (es. lvis.yaml, coco-seg.yaml, o custom.yaml)")
    parser.add_argument("--model", type=str, default="yolo11m-seg.pt", help="Pesi base (yolo11n-seg.pt, yolo11m-seg.pt, yolo11x-seg.pt)")
    parser.add_argument("--epochs", type=int, default=30, help="Numero di epoche")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (consigliato 16 per RTX 5070)")
    parser.add_argument("--imgsz", type=int, default=640, help="Risoluzione input (320, 640)")
    
    args = parser.parse_args()
    has_cuda = check_hardware()
    chosen_device = 0 if has_cuda else "cpu"
    
    train_segmentation(
        dataset_yaml=args.dataset,
        model_weights=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=str(chosen_device),
    )
