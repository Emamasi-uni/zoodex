@echo off
title Zoodex Backend API
echo ===================================================
echo     AVVIO SERVER ZOODEX (FastAPI + YOLO-seg)
echo ===================================================
cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creazione ambiente virtuale Python...
    py -3.12 -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)
echo Server in ascolto su http://0.0.0.0:8000
echo Raggiungibile dal Pixel 8a sulla stessa rete Wi-Fi!
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
