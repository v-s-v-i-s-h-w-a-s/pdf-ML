"""Lightweight local FastAPI app for development/testing.
This file avoids heavy optional dependencies (modal, torch, layoutparser).
It exposes the same endpoints as the main `modal_app.py` but with simple, deterministic outputs.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any

app = FastAPI(title="PDF Extraction Playground (dev)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Element(BaseModel):
    type: str
    text: str
    page: int
    bbox: List[int] = Field(description="[x_min, y_min, x_max, y_max] normalized to 0-1000")
    confidence: float

class ExtractedData(BaseModel):
    markdown_output: str
    elements: List[Element]
    metrics: Dict[str, Any]


@app.get("/models")
async def list_models():
    return [
        {"id": "surya", "name": "Surya", "description": "Mock Surya"},
        {"id": "docling", "name": "Docling", "description": "Mock Docling"},
        {"id": "custom-ocr", "name": "Custom OCR", "description": "Mock OCR"}
    ]


@app.post("/extract/{model_id}", response_model=ExtractedData)
async def extract_pdf(model_id: str, file: UploadFile = File(...)):
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Return a deterministic mock response for local dev
    markdown = f"# Mock extraction for {model_id}\n\nFile name: {file.filename}\n\nThis is a lightweight local extraction result."
    elements = [
        {"type": "title", "text": "Mock Title", "page": 1, "bbox": [50, 50, 950, 120], "confidence": 0.99},
        {"type": "paragraph", "text": "This is mock paragraph text.", "page": 1, "bbox": [50, 130, 950, 300], "confidence": 0.9},
    ]
    metrics = {"time_s": 0.01, "elements_count": len(elements), "word_count": 20}

    return {"markdown_output": markdown, "elements": elements, "metrics": metrics}


@app.post("/annotate/{model_id}")
async def annotate_image(model_id: str, elements: List[Dict] = None):
    """Return a PNG image (bytes) with bounding boxes drawn for provided elements.
    This endpoint is for local dev UI testing and expects 'elements' as JSON body.
    """
    from fastapi.responses import Response
    from .annotate import draw_annotations

    if elements is None:
        return Response(content=b"", media_type="image/png", status_code=400)

    try:
        png_bytes = draw_annotations(elements)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        return Response(content=b"", media_type="image/png", status_code=500)
