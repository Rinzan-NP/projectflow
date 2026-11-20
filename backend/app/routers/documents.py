import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import Project, ProjectDocument

router = APIRouter(tags=["documents"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/api/projects/{id}/documents")
def get_documents(
    id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(ProjectDocument).filter(ProjectDocument.projectId == project.id)
    if category and category != "All":
        query = query.filter(ProjectDocument.category == category)

    docs = query.order_by(ProjectDocument.createdAt.desc()).all()
    return docs

@router.post("/api/projects/{id}/documents", status_code=status.HTTP_201_CREATED)
async def create_document(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content_type = request.headers.get("content-type", "")

    # Multipart file upload
    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        title = form.get("title") or (file.filename if hasattr(file, "filename") else "Untitled")
        category = form.get("category") or "PRD"
        description = form.get("description")
        author = form.get("author") or project.owner or "Alex Rivers"
        content = form.get("content")

        file_url = None
        file_name = None
        file_size = None
        mime_type = None

        if file and hasattr(file, "filename") and file.filename:
            import time
            safe_name = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
            unique_name = f"{int(time.time())}-{safe_name}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)

            async with aiofiles.open(file_path, "wb") as out_file:
                content_bytes = await file.read()
                await out_file.write(content_bytes)

            file_url = f"/api/uploads/{unique_name}"
            file_name = file.filename
            file_size = len(content_bytes)
            mime_type = file.content_type or "application/octet-stream"

        doc = ProjectDocument(
            projectId=project.id,
            title=str(title).strip(),
            category=str(category),
            description=str(description) if description else None,
            content=str(content) if content else None,
            fileUrl=file_url,
            fileName=file_name,
            fileSize=file_size,
            mimeType=mime_type,
            author=str(author),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    # JSON body (inline note)
    data = await request.json()
    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    doc = ProjectDocument(
        projectId=project.id,
        title=title,
        category=data.get("category", "PRD"),
        description=data.get("description"),
        content=data.get("content"),
        fileUrl=data.get("fileUrl"),
        fileName=data.get("fileName"),
        fileSize=data.get("fileSize"),
        mimeType=data.get("mimeType", "text/markdown" if data.get("content") else None),
        author=data.get("author", project.owner or "Alex Rivers"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/api/projects/{id}/documents/{docId}")
def get_document(id: str, docId: str, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.patch("/api/projects/{id}/documents/{docId}")
async def update_document(id: str, docId: str, request: Request, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    data = await request.json()
    for field in ["title", "category", "description", "content"]:
        if field in data:
            setattr(doc, field, data[field])

    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/api/projects/{id}/documents/{docId}")
def delete_document(id: str, docId: str, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.fileUrl and doc.fileUrl.startswith("/api/uploads/"):
        filename = doc.fileUrl.replace("/api/uploads/", "")
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
