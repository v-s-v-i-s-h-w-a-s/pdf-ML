"""Lightweight local FastAPI app for development/testing.
This file avoids heavy optional dependencies (modal, torch, layoutparser).
It exposes the same endpoints as the main `modal_app.py` but with simple, deterministic outputs.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import io
import time
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTFigure, LTImage
try:
    import pytesseract
    from pytesseract import Output as PTOutput
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

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
async def extract_pdf(model_id: str, file: UploadFile = File(...), download: bool = False):
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Try to extract using pdfminer.six for born-digital PDFs
    try:
        markdown_parts = []
        elements = []
        page_num = 0
        total_words = 0

        with io.BytesIO(file_bytes) as fp:
            for page_layout in extract_pages(fp):
                page_num += 1
                page_height = page_layout.height
                page_width = page_layout.width

                for element in page_layout:
                    if isinstance(element, LTTextContainer):
                        text = element.get_text().strip()
                        if not text:
                            continue

                        # Normalize bbox to 0-1000 scale (top-left origin)
                        x0, y0, x1, y1 = element.bbox
                        y_min_norm = int(1000 * (1 - y1 / page_height))
                        y_max_norm = int(1000 * (1 - y0 / page_height))
                        x_min_norm = int(1000 * x0 / page_width)
                        x_max_norm = int(1000 * x1 / page_width)
                        bbox = [x_min_norm, y_min_norm, x_max_norm, y_max_norm]

                        markdown_parts.append(text + "\n\n")
                        total_words += len(text.split())

                        element_type = "paragraph"
                        if bbox[1] < 100:
                            element_type = "header"
                        if len(text) < 60 and bbox[1] < 150:
                            element_type = "title"

                        elements.append({
                            "type": element_type,
                            "text": text,
                            "page": page_num,
                            "bbox": bbox,
                            "confidence": 0.9,
                        })

                    elif isinstance(element, (LTFigure, LTImage)):
                        # Represent figures/images as placeholders
                        x0, y0, x1, y1 = getattr(element, 'bbox', (0, 0, 0, 0))
                        bbox = [0, 0, 1000, 1000]
                        elements.append({
                            "type": "figure",
                            "text": f"[Figure on page {page_num}]",
                            "page": page_num,
                            "bbox": bbox,
                            "confidence": 0.85,
                        })

        if markdown_parts:
            markdown = "# Extracted Text\n\n" + "".join(markdown_parts)
            metrics = {"time_s": 0.05, "elements_count": len(elements), "word_count": total_words}
            if download:
                # Return a streaming Markdown file
                safe_name = (file.filename or model_id).replace(' ', '_')
                md_bytes = markdown.encode('utf-8')
                headers = {"Content-Disposition": f'attachment; filename="{safe_name}.md"'}
                return StreamingResponse(io.BytesIO(md_bytes), media_type='text/markdown', headers=headers)
            return {"markdown_output": markdown, "elements": elements, "metrics": metrics}
        # If no text extracted and OCR is available, run OCR fallback with detailed boxes
        if not markdown_parts and OCR_AVAILABLE:
            try:
                start_ocr = time.time()
                images = convert_from_bytes(file_bytes, dpi=200)
                ocr_text_parts = []
                ocr_elements = []
                page_no = 0
                total_words_ocr = 0

                for img in images:
                    page_no += 1
                    # Use pytesseract to get detailed data
                    data = pytesseract.image_to_data(img, output_type=PTOutput.DICT)
                    n_boxes = len(data.get('text', []))
                    # Group words into paragraphs by block_num + par_num
                    groups = {}
                    for i in range(n_boxes):
                        text = (data.get('text', [''])[i] or '').strip()
                        if not text:
                            continue
                        block = data.get('block_num', [0])[i]
                        par = data.get('par_num', [0])[i]
                        key = (block, par)
                        left = int(data.get('left', [0])[i])
                        top = int(data.get('top', [0])[i])
                        width = int(data.get('width', [0])[i])
                        height = int(data.get('height', [0])[i])
                        conf = float(data.get('conf', ['-1'])[i]) if data.get('conf', [None])[i] is not None else -1
                        if key not in groups:
                            groups[key] = { 'words': [], 'lefts': [], 'tops': [], 'rights': [], 'bottoms': [], 'confs': [] }
                        groups[key]['words'].append(text)
                        groups[key]['lefts'].append(left)
                        groups[key]['tops'].append(top)
                        groups[key]['rights'].append(left + width)
                        groups[key]['bottoms'].append(top + height)
                        if conf >= 0:
                            groups[key]['confs'].append(conf)

                    # Convert groups into paragraph elements
                    for info in groups.values():
                        paragraph_text = ' '.join(info['words']).strip()
                        if not paragraph_text:
                            continue
                        total_words_ocr += len(paragraph_text.split())
                        img_w, img_h = img.size
                        x_min = min(info['lefts'])
                        y_min = min(info['tops'])
                        x_max = max(info['rights'])
                        y_max = max(info['bottoms'])
                        # Normalize coordinates to 0-1000 (top-left origin)
                        x_min_norm = int(1000 * x_min / img_w)
                        y_min_norm = int(1000 * y_min / img_h)
                        x_max_norm = int(1000 * x_max / img_w)
                        y_max_norm = int(1000 * y_max / img_h)
                        bbox = [x_min_norm, y_min_norm, x_max_norm, y_max_norm]
                        conf_avg = (sum(info['confs']) / len(info['confs'])) if info['confs'] else 70.0

                        ocr_elements.append({
                            'type': 'paragraph',
                            'text': paragraph_text,
                            'page': page_no,
                            'bbox': bbox,
                            'confidence': round(conf_avg / 100.0, 2),
                        })
                        ocr_text_parts.append(paragraph_text + "\n\n")

                if ocr_text_parts:
                    time_s = round(time.time() - start_ocr, 2)
                    # Build YAML front-matter
                    yaml_meta = f"---\nfilename: '{file.filename}'\nmodel: '{model_id}'\ntime_s: {time_s}\nelements: {len(ocr_elements)}\nword_count: {total_words_ocr}\n---\n\n"

                    md_parts = []
                    for el in ocr_elements:
                        # Heuristic: short top elements -> title
                        if len(el['text']) < 60 and el['bbox'][1] < 150:
                            md_parts.append('# ' + el['text'] + '\n\n')
                        else:
                            md_parts.append(el['text'] + '\n\n')

                    markdown = yaml_meta + ''.join(md_parts)
                    metrics = {"time_s": time_s, "elements_count": len(ocr_elements), "word_count": total_words_ocr}
                    if download:
                        safe_name = (file.filename or model_id).replace(' ', '_')
                        md_bytes = markdown.encode('utf-8')
                        headers = {"Content-Disposition": f'attachment; filename="{safe_name}_ocr.md"'}
                        return StreamingResponse(io.BytesIO(md_bytes), media_type='text/markdown', headers=headers)
                    return {"markdown_output": markdown, "elements": ocr_elements, "metrics": metrics}
            except Exception as e:
                print(f"OCR fallback error: {e}")
    except Exception as e:
        # Fall back to mock extraction if pdfminer fails
        print(f"pdfminer extraction error: {e}")

    # Fallback deterministic mock response
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
