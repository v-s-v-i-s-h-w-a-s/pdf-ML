from PIL import Image, ImageDraw, ImageFont
import io
from typing import List, Dict

# Simple color map for element types
COLOR_MAP = {
    "title": (255, 0, 0),        # red
    "header": (255, 128, 0),     # orange
    "paragraph": (0, 128, 255),  # blue
    "table": (0, 200, 0),        # green
    "figure": (128, 0, 255),     # purple
    "default": (200, 200, 200),  # gray
}


def _get_color(element_type: str):
    return COLOR_MAP.get(element_type, COLOR_MAP["default"])


def draw_annotations(elements: List[Dict], page: int = 1, canvas_size=(1200, 1600)) -> bytes:
    """Draws bounding boxes for provided elements and returns PNG bytes.

    Parameters:
    - elements: list of dicts with keys: type, bbox (x_min,y_min,x_max,y_max) where coords are 0-1000
    - page: page number (not used for rendering here but kept in signature)
    - canvas_size: output image size in pixels (width, height)

    Returns PNG image bytes.
    """
    width, height = canvas_size
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Attempt to load a default font
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for el in elements:
        try:
            el_type = el.get("type", "default")
            bbox = el.get("bbox", [0, 0, 0, 0])
            # bbox expected normalized 0-1000; scale to canvas
            x_min = int(bbox[0] * width / 1000)
            y_min = int(bbox[1] * height / 1000)
            x_max = int(bbox[2] * width / 1000)
            y_max = int(bbox[3] * height / 1000)

            color = _get_color(el_type)
            # Draw rectangle
            draw.rectangle([x_min, y_min, x_max, y_max], outline=color, width=3)

            # Draw label background
            label = f"{el_type} (p{el.get('page', page)})"
            text_size = draw.textsize(label, font=font)
            label_bg = (x_min, max(0, y_min - text_size[1] - 4), x_min + text_size[0] + 6, y_min)
            draw.rectangle(label_bg, fill=(255, 255, 255))
            draw.text((x_min + 3, max(0, y_min - text_size[1] - 2)), label, fill=color, font=font)
        except Exception:
            # continue on element errors
            continue

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()
