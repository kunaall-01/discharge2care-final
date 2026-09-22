"""
Document Text Extraction
------------------------
Turns an uploaded discharge summary (PDF or image) into plain text.

PDFs are read with PyMuPDF. Scanned/image-only pages — which produce no
embedded text — fall back to Tesseract OCR on a rendered pixmap, so a
photographed printout and a native PDF both work through the same path.

Unlike pill_verification.ocr_service, preprocessing here is deliberately
light: a full A4 page of small print is damaged by the aggressive
thresholding used for glossy foil wrappers.
"""

import io
from typing import Tuple

import pytesseract
from PIL import Image

try:
    import pymupdf
except ImportError:  # PyMuPDF <1.24 only exposes the `fitz` name
    import fitz as pymupdf

# OCR is CPU-bound and Render's free tier is small; cap the work per upload.
MAX_PAGES = 25
RENDER_DPI = 300
MIN_TEXT_CHARS_PER_PAGE = 20

DOC_OCR_CONFIG = r"--oem 3 --psm 3"


def _ocr_pil_image(image: Image.Image) -> str:
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Upscale small phone photos — Tesseract needs roughly 30px cap height.
    width, height = image.size
    if max(width, height) < 1500:
        scale = 1500 / max(width, height)
        image = image.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

    return pytesseract.image_to_string(image, config=DOC_OCR_CONFIG)


def _ocr_image_bytes(file_bytes: bytes) -> Tuple[str, int, bool]:
    image = Image.open(io.BytesIO(file_bytes))
    return _ocr_pil_image(image), 1, True


def _extract_pdf(file_bytes: bytes) -> Tuple[str, int, bool]:
    document = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages_text = []
    ocr_used = False

    try:
        page_count = min(document.page_count, MAX_PAGES)
        for index in range(page_count):
            page = document[index]
            text = page.get_text("text")

            if len(text.strip()) < MIN_TEXT_CHARS_PER_PAGE:
                # Scanned page — render and OCR it.
                pixmap = page.get_pixmap(dpi=RENDER_DPI)
                rendered = Image.open(io.BytesIO(pixmap.tobytes("png")))
                text = _ocr_pil_image(rendered)
                ocr_used = True

            pages_text.append(text)
    finally:
        document.close()

    return "\n".join(pages_text), len(pages_text), ocr_used


def extract_document_text(file_bytes: bytes, content_type: str) -> Tuple[str, int, bool]:
    """
    Returns (text, pages_read, ocr_used).
    """
    if content_type == "application/pdf":
        return _extract_pdf(file_bytes)
    return _ocr_image_bytes(file_bytes)
