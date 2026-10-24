"""Tests for BioCLIP Zoological Classifier and Two-Stage Pipeline."""

import io
import pytest
import torch
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.main import app
from app.services.bioclip_classifier import get_bioclip_classifier
from app.services.detector import get_detector, ANIMAL_CLASS_IDS, is_animal_label
from app.data.dex_catalog import get_dex_entry_by_species

client = TestClient(app)

def test_bioclip_initialization_and_embeddings():
    """Verifies that BioCLIP loads and pre-computes text embeddings in VRAM/RAM."""
    classifier = get_bioclip_classifier()
    assert classifier.is_ready is True
    assert len(classifier.species_keys) >= 4
    assert classifier.text_features is not None
    # Embedding dimensions should match (N, 512)
    assert classifier.text_features.shape[0] == len(classifier.species_keys)
    assert classifier.text_features.shape[1] == 512
    # Embeddings must be unit-normalized
    norms = classifier.text_features.norm(dim=-1)
    assert torch.allclose(norms, torch.ones_like(norms), atol=1e-3)


def test_bioclip_classification_synthetic_crop():
    """Tests classifying a cropped animal image with BioCLIP."""
    classifier = get_bioclip_classifier()
    crop = Image.new("RGB", (224, 224), color=(180, 140, 80))
    draw = ImageDraw.Draw(crop)
    draw.ellipse([40, 40, 180, 180], fill=(120, 80, 40))

    result = classifier.classify_crop(crop, top_k=3)
    assert result is not None
    assert "species_key" in result
    assert "confidence" in result
    assert "continente" in result
    assert "top_matches" in result
    assert len(result["top_matches"]) == 3
    assert result["confidence"] > 0.0


def test_animal_class_mapping():
    """Verifies O(1) animal class identification and avoidance of false positives."""
    detector = get_detector()
    assert len(detector.animal_class_ids) > 0
    # Common animal labels
    assert is_animal_label("cat") is True
    assert is_animal_label("dog") is True
    assert is_animal_label("lion") is True
    assert is_animal_label("wolf") is True
    # Non-animal items must NOT match
    assert is_animal_label("bottle") is False
    assert is_animal_label("chair") is False
    assert is_animal_label("hot dog") is False
    assert is_animal_label("teddy bear") is False


def test_two_stage_scan_endpoint():
    """Verifies full scan API endpoint with two-stage pipeline."""
    img = Image.new("RGB", (320, 320), color=(200, 220, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 200, 200], fill=(130, 90, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/scan",
        files={"file": ("lion_test.jpg", buf, "image/jpeg")},
        data={"conf_threshold": "0.10", "device_id": "test_bioclip_user"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "detections" in data
    assert "candidates" in data
    assert "newly_unlocked" in data


def test_model_info_reports_bioclip():
    """Verifies /api/v1/model-info reports both YOLO and BioCLIP status."""
    res = client.get("/api/v1/model-info")
    assert res.status_code == 200
    info = res.json()
    assert info["model_active"] is True
    assert "bioclip_active" in info
    assert info["bioclip_active"] is True
    assert "bioclip_species_count" in info
    assert info["bioclip_species_count"] >= 4
