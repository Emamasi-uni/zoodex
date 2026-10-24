"""Hugging Face Space & FastAPI Entrypoint for Zoodex.

Compatible with Hugging Face Spaces SDK: gradio (Free 2 vCPU · 16 GB RAM).
Mounts FastAPI REST routes (/api/v1/scan-json, /health, /api/v1/continents, /api/v1/animals)
and provides an interactive web tester dashboard on port 7860.
"""

import os
import uvicorn
from app.main import app as fastapi_app

try:
    import gradio as gr
    from PIL import Image
    from app.services.detector import get_detector
    from app.data.dex_catalog import get_catalog

    detector = get_detector()
    catalog = get_catalog()

    def test_scan(image: Image.Image):
        if image is None:
            return None, "Carica un'immagine per testare la scansione."
        
        detections = detector.detect_and_segment(image)
        # Draw bounding boxes and labels onto the preview image
        from PIL import ImageDraw
        annotated = image.copy()
        draw = ImageDraw.Draw(annotated)
        w, h = annotated.size

        info_lines = [f"### 🐾 Rilevati {len(detections)} elementi (YOLO + BioCLIP):\n"]
        for d in detections:
            dex = d.get("dex_entry", {})
            b = d.get("box", {})
            stage = d.get("stage", "yolo")
            is_animal_str = f"Animale ({stage.upper()})" if d.get("is_animal") else "Oggetto/Altro"
            
            box_coords = [b.get("xmin", 0) * w, b.get("ymin", 0) * h, b.get("xmax", 0) * w, b.get("ymax", 0) * h]
            outline_color = "#10B981" if d.get("is_animal") else "#38BDF8"
            draw.rectangle(box_coords, outline=outline_color, width=3)

            info_lines.append(
                f"- #{dex.get('dex_number', '???')} **{dex.get('name', d.get('class_name'))}** "
                f"(*{dex.get('scientific_name', 'N/A')}*) — Continente: **{dex.get('continent_name', 'Globale')}** "
                f"[{is_animal_str}] — Confidenza: **{d.get('confidence', 0):.1%}**"
            )
        return annotated, "\n".join(info_lines)

    with gr.Blocks(title="Zoodex AI Vision Engine") as demo:
        gr.Markdown(
            """
            # 🐾 Zoodex AI Vision Engine
            ### Backend FastAPI + YOLO11 Segmentazione per la catalogazione della fauna
            
            - **Stato API**: Attivo e pronto per l'app mobile Zoodex
            - **Endpoint REST**: `POST /api/v1/scan-json`, `GET /health`, `GET /api/v1/continents`, `GET /api/v1/animals`
            """
        )
        with gr.Row():
            with gr.Column():
                input_img = gr.Image(type="pil", label="Carica o scatta foto animale")
                scan_btn = gr.Button("🔍 Esegui Scansione AI", variant="primary")
            with gr.Column():
                output_img = gr.Image(type="pil", label="Visualizzazione Contorni e HUD")
                output_text = gr.Markdown(label="Dati Riconoscimento Specie")
        
        scan_btn.click(fn=test_scan, inputs=[input_img], outputs=[output_img, output_text])

    # Mount Gradio onto the FastAPI app
    app = gr.mount_gradio_app(fastapi_app, demo, path="/")

except Exception as e:
    # If gradio is not installed or fails, fallback cleanly to standard FastAPI
    app = fastapi_app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
