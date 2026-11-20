import os
import time
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Item, Attachment

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/api/upload", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    itemId: str = Form(...),
    db: Session = Depends(get_db),
):
    item = db.query(Item).filter(Item.id == itemId).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    original_name = file.filename or "attachment"
    safe_name = "".join(c for c in original_name if c.isalnum() or c in "._- ")
    unique_name = f"{int(time.time())}-{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    content_bytes = await file.read()
    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(content_bytes)

    url = f"/api/uploads/{unique_name}"
    attachment = Attachment(
        itemId=item.id,
        name=original_name,
        url=url,
        sizeBytes=len(content_bytes),
        mimeType=file.content_type or "application/octet-stream",
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {
        "id": attachment.id,
        "name": attachment.name,
        "url": attachment.url,
        "sizeBytes": attachment.sizeBytes,
        "mimeType": attachment.mimeType,
        "createdAt": attachment.createdAt,
    }

@router.get("/api/uploads/{filename}")
def serve_upload(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@router.delete("/api/attachments/{id}")
def delete_attachment(id: str, db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if att.url and att.url.startswith("/api/uploads/"):
        filename = att.url.replace("/api/uploads/", "")
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted"}
