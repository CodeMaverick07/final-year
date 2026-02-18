from __future__ import annotations

import asyncio
import base64
import io
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Iterable

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import vision

try:
    from pdf2image import convert_from_bytes
except ImportError:  # pragma: no cover
    convert_from_bytes = None

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PDF_DPI = int(os.getenv("OCR_PDF_DPI", "170"))
PDF_THREAD_COUNT = int(os.getenv("OCR_PDF_THREAD_COUNT", "2"))
OCR_PARALLELISM = int(os.getenv("OCR_PARALLELISM", "3"))


def resolve_poppler_path() -> str | None:
    env_path = os.getenv("POPPLER_PATH")
    if env_path:
        return env_path

    for candidate in ("/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"):
        pdfinfo_bin = Path(candidate) / "pdfinfo"
        pdftoppm_bin = Path(candidate) / "pdftoppm"
        if pdfinfo_bin.exists() and pdftoppm_bin.exists():
            return candidate

    return None


POPPLER_PATH = resolve_poppler_path()


@lru_cache(maxsize=1)
def get_vision_client() -> vision.ImageAnnotatorClient:
    return vision.ImageAnnotatorClient()


def is_pdf_upload(file: UploadFile) -> bool:
    return (
        file.content_type == "application/pdf"
        or bool(file.filename and file.filename.lower().endswith(".pdf"))
    )


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    client = get_vision_client()
    image = vision.Image(content=image_bytes)

    # document_text_detection is usually better for manuscript/page-style text.
    response = client.document_text_detection(image=image)
    if response.error.message:
        raise RuntimeError(response.error.message)

    full_text = (response.full_text_annotation.text or "").strip()
    if full_text:
        return full_text

    if response.text_annotations:
        first = (response.text_annotations[0].description or "").strip()
        if first:
            return first

    return ""


def to_png_bytes(pil_image) -> bytes:
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG")
    return buf.getvalue()


def process_pdf_bytes(pdf_bytes: bytes) -> str:
    if convert_from_bytes is None:
        raise RuntimeError(
            "PDF processing requires pdf2image + poppler. Install pdf2image and system poppler-utils."
        )

    pages = convert_from_bytes(
        pdf_bytes,
        dpi=PDF_DPI,
        fmt="png",
        thread_count=max(PDF_THREAD_COUNT, 1),
        poppler_path=POPPLER_PATH,
    )

    if not pages:
        return ""

    page_png_bytes = [to_png_bytes(page) for page in pages]

    # OCR page calls are network-bound; run a few in parallel to reduce latency.
    max_workers = max(1, min(OCR_PARALLELISM, len(page_png_bytes)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        page_texts = list(executor.map(extract_text_from_image_bytes, page_png_bytes))

    clean_texts = [text.strip() for text in page_texts if text and text.strip()]
    return "\n\n--- Page Break ---\n\n".join(clean_texts)


def encode_images_as_data_urls(images: Iterable) -> list[str]:
    encoded = []
    for pil_image in images:
        img_bytes = to_png_bytes(pil_image)
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        encoded.append(f"data:image/png;base64,{b64}")
    return encoded


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            return {"error": "Uploaded file is empty"}

        if is_pdf_upload(file):
            text = await asyncio.to_thread(process_pdf_bytes, content)
            return {"text": text if text else "No text detected in PDF."}

        text = await asyncio.to_thread(extract_text_from_image_bytes, content)
        return {"text": text if text else "No text detected."}
    except Exception as exc:  # pragma: no cover
        message = str(exc)
        if "Unable to get page count" in message:
            return {
                "error": (
                    "Poppler is required for PDF OCR. Install it (macOS: `brew install poppler`) "
                    "and ensure `pdfinfo`/`pdftoppm` are in PATH, or set POPPLER_PATH to their directory."
                )
            }
        return {"error": message}


@app.post("/pdf-to-images")
async def pdf_to_images_endpoint(file: UploadFile = File(...)):
    """Convert PDF pages to base64-encoded PNG images."""
    try:
        if not is_pdf_upload(file):
            return {"error": "File is not a PDF"}

        if convert_from_bytes is None:
            return {
                "error": "PDF conversion requires pdf2image + poppler. Install pdf2image and system poppler-utils."
            }

        content = await file.read()
        if not content:
            return {"error": "Uploaded file is empty"}

        pages = await asyncio.to_thread(
            convert_from_bytes,
            content,
            dpi=PDF_DPI,
            fmt="png",
            thread_count=max(PDF_THREAD_COUNT, 1),
            poppler_path=POPPLER_PATH,
        )

        if not pages:
            return {"error": "Could not extract pages from PDF"}

        images = await asyncio.to_thread(encode_images_as_data_urls, pages)
        return {"images": images, "pageCount": len(images)}
    except Exception as exc:  # pragma: no cover
        message = str(exc)
        if "Unable to get page count" in message:
            return {
                "error": (
                    "Poppler is required for PDF conversion. Install it (macOS: `brew install poppler`) "
                    "and ensure `pdfinfo`/`pdftoppm` are in PATH, or set POPPLER_PATH."
                )
            }
        return {"error": message}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
