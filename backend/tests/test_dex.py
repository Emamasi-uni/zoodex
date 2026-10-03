import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_continents():
    res = client.get("/api/v1/continents")
    assert res.status_code == 200
    continents = res.json()
    assert len(continents) == 6
    names = [c["name"] for c in continents]
    assert "Europa" in names
    assert "Africa" in names

def test_animals_catalog():
    res = client.get("/api/v1/animals?continent=europa")
    assert res.status_code == 200
    animals = res.json()
    assert len(animals) > 0
    assert any(a["name"] == "Gatto Selvatico" for a in animals)

def test_scan_image():
    # Create a synthetic image with a shape
    img = Image.new("RGB", (320, 320), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 60, 240, 240], fill=(40, 40, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/scan",
        files={"file": ("test.jpg", buf, "image/jpeg")},
        data={"conf_threshold": "0.2", "device_id": "test_device"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "detections" in data
