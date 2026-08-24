FROM python:3.11-slim

# Install Tesseract OCR (system-level binary) + OpenCV runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

# server.py defines `app = FastAPI()` at module level — matches your existing file
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
