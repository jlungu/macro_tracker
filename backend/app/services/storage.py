"""
Supabase Storage service — uploads meal images and returns public URLs.
"""

import base64
import uuid
from app.config import settings
from app.database import get_db


async def upload_meal_image(
    image_base64: str,
    mime_type: str = "image/jpeg",
) -> str:
    """Upload a base64-encoded image and return its public URL."""
    db = get_db()
    ext = mime_type.split("/")[-1].replace("jpeg", "jpg")
    filename = f"{uuid.uuid4()}.{ext}"

    image_bytes = base64.b64decode(image_base64)

    db.storage.from_(settings.supabase_storage_bucket).upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": mime_type},
    )

    public_url: str = db.storage.from_(settings.supabase_storage_bucket).get_public_url(filename)
    return public_url
