# 📊 Zoodex — Registro & Documentazione dell'Addestramento (Training Log)

> **Progetto:** Zoodex — Riconoscimento & Segmentazione Istantanea Universale  
> **Data di Avvio:** 2026-10-03  
> **Hardware:** NVIDIA GeForce RTX 5070 (12 GB VRAM GDDR7, Architettura Blackwell `sm_120`)  
> **Framework:** PyTorch 2.12.0+cu128 · Ultralytics YOLO11  

---

## 1. Parametri di Configurazione del Run

| Parametro | Valore | Descrizione |
|---|---|---|
| **Modello Base** | `yolo11m-seg.pt` | Rete neurale di medie dimensioni (23.2M parametri, 118 GFLOPs), ottimo compromesso tra velocità e precisione |
| **Dataset** | `lvis.yaml` | Large Vocabulary Instance Segmentation: **1.203 categorie** |
| **Immagini di Train** | 100.170 | Immagini annotate con poligoni di segmentazione al pixel |
| **Immagini di Val** | 19.822 | Immagini di controllo (mai viste durante il training) |
| **Risoluzione (imgsz)** | 640 × 640 | Risoluzione standard ad alta definizione per dettagli fini |
| **Dimensione Batch** | 16 | 16 immagini elaborate in parallelo ad ogni iterazione sulla RTX 5070 |
| **Epoche Totali** | 50 | Numero di passaggi completi attraverso l'intero dataset |
| **Precisione (AMP)** | FP16 (Half) | Calcolo accelerato tramite i Tensor Core a 16 bit |
| **Directory Output** | `zoodex_runs/zoodex_seg_custom/` | Cartella in cui vengono salvati checkpoint e grafici |

---

## 2. Come Funziona l'Addestramento (Spiegazione Tecnica)

### A. Perché si chiama Fine-Tuning (Transfer Learning)?
Non stiamo addestrando la rete da zero partendo dal "buio". Il modello `yolo11m-seg.pt` è già pre-addestrato su milioni di immagini:
- I primi strati (**Backbone**) sanno già identificare bordi, ombre, forme geometriche, curvature e texture di peli, piume o metalli.
- Gli strati intermedi (**Neck**) combinano queste informazioni a scale diverse (oggetti piccoli in lontananza e oggetti grandi in primo piano).
- Durante il **Fine-Tuning**, la rete riadatta principalmente la testa finale (**Head**) per mappare le forme estratte sulle **1.203 classi del vocabolario LVIS** anziché sulle 80 classi originali.

### B. Come lavora la Segmentazione (Maschere al Pixel)?
A differenza della semplice *object detection* (che disegna solo un rettangolo), YOLO-seg usa un'architettura a **due rami paralleli**:
1. **Ramo Bounding Box & Classi:** predice le coordinate del riquadro $[x, y, w, h]$ e la probabilità percentuale per ciascuna delle 1.203 classi.
2. **Ramo Prototipi (Proto Head):** genera 32 "maschere base" bidimensionali ad alta risoluzione per l'intera scena.
3. Per ogni oggetto rilevato, la rete calcola 32 coefficienti scalari. La maschera finale viene generata moltiplicando i coefficienti per i prototipi, applicando una funzione `Sigmoide` e ritagliando la sagoma all'interno del bounding box. Questo è il motivo per cui lo scontorno è così veloce ed elegante!

### C. Cosa fa la GPU ad ogni iterazione (Step)?
Per ogni gruppo di 16 immagini (1 Batch):
1. **Forward Pass:** le 16 immagini passano attraverso i 253 strati della rete. Vengono generate le predizioni attuali.
2. **Calcolo della Loss (Errore):** la funzione di perdita misura quanto le predizioni si discostano dalla realtà:
   - `box_loss`: penalità se il rettangolo non coincide perfettamente con l'oggetto.
   - `seg_loss`: penalità per ogni pixel della maschera che sbava fuori o non copre l'oggetto.
   - `cls_loss`: penalità se sbaglia a classificare (es. confonde un coyote con un lupo).
   - `dfl_loss`: rifinisce la certezza geometrica dei confini.
3. **Backward Pass (Backpropagation):** calcola il gradiente dell'errore e aggiorna i pesi della rete con l'ottimizzatore per fare un passo verso l'accuratezza ideale.

---

## 3. Come Leggere l'Output a Video nel Terminale

Durante il training vedrai righe simili a questa:

```text
Epoch   GPU_mem   box_loss   seg_loss   cls_loss   dfl_loss   Instances   Size
 1/50     6.8G      1.145      1.482      2.310      1.050       84        640
```

- **`Epoch 1/50`**: epoca corrente su 50 totali.
- **`GPU_mem`**: quanta memoria VRAM della RTX 5070 è attualmente occupata (es. ~6-8 GB su 12 GB).
- **`box_loss`, `seg_loss`, `cls_loss`**: devono **diminuire gradualmente** man mano che le epoche avanzano. Più scendono, più il modello è preciso.
- **`mAP50` e `mAP50-95` (a fine epoca)**:
  - `mAP50` (Mean Average Precision al 50% di sovrapposizione): indica la percentuale di riconoscimento corretta. Più è alta (es. 0.60, 0.75, 0.85), migliore è il modello.
  - Vengono mostrati due valori: uno per i **Box** e uno per le **Maschere (Mask)**.

---

## 4. File Prodotti al Termine

Al termine delle 50 epoche, nella cartella `zoodex_runs/zoodex_seg_custom/` troverai:

1. `weights/best.pt`: **Il checkpoint migliore in assoluto** (quello con il punteggio mAP più alto registrato durante tutte le 50 epoche).
2. `weights/last.pt`: Il modello all'ultima epoca (serve se vuoi riprendere l'addestramento con `resume=True`).
3. `results.png`: Grafico con l'andamento della discesa della perdita (Loss) e della salita della precisione (mAP).
4. `confusion_matrix.png`: Matrice di confusione che mostra quali classi vengono distinte meglio.

---

## 5. Come Attivare il Nuovo Modello nell'App Zoodex

Non appena il file `best.pt` è generato:

1. Copia `zoodex_runs/zoodex_seg_custom/weights/best.pt` nella cartella `backend/`:
   ```powershell
   Copy-Item zoodex_runs/zoodex_seg_custom/weights/best.pt -Destination backend/yolo11n-seg.pt
   ```
2. Riavvia il server backend:
   ```powershell
   # Il server FastAPI ricaricherà automaticamente il nuovo modello potenziato
   ```
3. L'app sul tuo Pixel 8a riconoscerà e sconterà all'istante tutte le **1.203 classi** di animali e oggetti del mondo reale!
