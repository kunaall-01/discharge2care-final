"""
OCR Service
-----------
Extracts raw text from a medicine wrapper/strip image using Tesseract OCR.
Includes basic image pre-processing (grayscale, thresholding, denoising)
to improve OCR accuracy on foil/plastic wrapper photos, which are often
glossy, low-contrast, or slightly angled.
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
import io


def _preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Convert raw image bytes into an OpenCV image optimized for OCR."""
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = np.array(pil_image)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Upscale small images — improves OCR on tiny wrapper text
    height, width = img.shape[:2]
    if max(height, width) < 1000:
        scale = 1000 / max(height, width)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise (wrapper photos are often noisy/glossy)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold to handle uneven lighting on foil wrappers
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 11
    )

    return thresh


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Run OCR on a medicine wrapper image and return extracted raw text.

    Args:
        image_bytes: Raw bytes of the uploaded image file.

    Returns:
        Extracted text (uppercased, whitespace-normalized).
    """
    processed = _preprocess_image(image_bytes)

    # PSM 6: assume a uniform block of text — works well for wrapper labels
    custom_config = r"--oem 3 --psm 6"
    raw_text = pytesseract.image_to_string(processed, config=custom_config)

    # Fallback: if adaptive-thresholded image yields very little text,
    # retry OCR directly on the original (non-thresholded) image
    if len(raw_text.strip()) < 3:
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        raw_text = pytesseract.image_to_string(pil_image, config=custom_config)

    cleaned = " ".join(raw_text.split())
    return cleaned.upper()
