import os
import aiofiles
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import Project, ProjectDocument

router = APIRouter(tags=["documents"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def serialize_document(doc: ProjectDocument):
    return {
        "id": doc.id,
        "projectId": doc.projectId,
        "company": doc.company or (doc.project.company if doc.project else None),
        "projectName": doc.project.name if doc.project else None,
        "projectKey": doc.project.key if doc.project else None,
        "projectColor": doc.project.color if doc.project else None,
        "title": doc.title,
        "description": doc.description,
        "category": doc.category,
        "fileUrl": doc.fileUrl,
        "fileName": doc.fileName,
        "fileSize": doc.fileSize,
        "mimeType": doc.mimeType,
        "content": doc.content,
        "author": doc.author,
        "createdAt": doc.createdAt,
        "updatedAt": doc.updatedAt,
    }

@router.get("/api/documents")
def get_all_documents(
    company: Optional[str] = None,
    projectId: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ProjectDocument).outerjoin(Project, ProjectDocument.projectId == Project.id)

    if company and company != "ALL":
        query = query.filter((ProjectDocument.company == company) | (Project.company == company))

    if projectId in ["NONE", "NO_PROJECT"]:
        query = query.filter(ProjectDocument.projectId == None)
    elif projectId and projectId != "ALL":
        query = query.filter((ProjectDocument.projectId == projectId) | (Project.key == projectId.upper()))

    if category and category != "All":
        query = query.filter(ProjectDocument.category == category)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (ProjectDocument.title.ilike(term))
            | (ProjectDocument.description.ilike(term))
            | (ProjectDocument.fileName.ilike(term))
        )

    docs = query.order_by(ProjectDocument.createdAt.desc()).all()
    return [serialize_document(d) for d in docs]

@router.post("/api/documents", status_code=status.HTTP_201_CREATED)
async def create_general_document(
    request: Request,
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")

    # Multipart file upload
    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        title = form.get("title") or (file.filename if hasattr(file, "filename") else "Untitled")
        category = form.get("category") or "General"
        description = form.get("description")
        author = form.get("author") or "Rinzan"
        content = form.get("content")
        company = form.get("company")
        project_val = form.get("projectId")

        project = None
        if project_val and str(project_val).upper() not in ["NONE", "NO_PROJECT", "ALL"]:
            project = db.query(Project).filter((Project.id == str(project_val)) | (Project.key == str(project_val).upper())).first()

        effective_company = (project.company if project else None) or company or "General"

        file_url = None
        file_name = None
        file_size = None
        mime_type = None

        if file and hasattr(file, "filename") and file.filename:
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
            projectId=project.id if project else None,
            company=effective_company,
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
        return serialize_document(doc)

    # JSON body (inline note)
    data = await request.json()
    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    project_val = data.get("projectId")
    project = None
    if project_val and str(project_val).upper() not in ["NONE", "NO_PROJECT", "ALL"]:
        project = db.query(Project).filter((Project.id == str(project_val)) | (Project.key == str(project_val).upper())).first()

    effective_company = (project.company if project else None) or data.get("company") or "General"

    doc = ProjectDocument(
        projectId=project.id if project else None,
        company=effective_company,
        title=title,
        category=data.get("category", "General"),
        description=data.get("description"),
        content=data.get("content"),
        fileUrl=data.get("fileUrl"),
        fileName=data.get("fileName"),
        fileSize=data.get("fileSize"),
        mimeType=data.get("mimeType", "text/markdown" if data.get("content") else None),
        author=data.get("author", "Rinzan"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return serialize_document(doc)

@router.get("/api/documents/{docId}")
def get_single_document(docId: str, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(doc)

@router.patch("/api/documents/{docId}")
async def update_single_document(docId: str, request: Request, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    data = await request.json()
    for field in ["title", "category", "description", "content", "company"]:
        if field in data:
            setattr(doc, field, data[field])

    if "projectId" in data:
        p_val = data["projectId"]
        if not p_val or str(p_val).upper() in ["NONE", "NO_PROJECT"]:
            doc.projectId = None
        else:
            proj = db.query(Project).filter((Project.id == str(p_val)) | (Project.key == str(p_val).upper())).first()
            if proj:
                doc.projectId = proj.id
                doc.company = proj.company

    db.commit()
    db.refresh(doc)
    return serialize_document(doc)

@router.delete("/api/documents/{docId}")
def delete_single_document(docId: str, db: Session = Depends(get_db)):
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
    return [serialize_document(d) for d in docs]

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
        author = form.get("author") or project.owner or "Rinzan"
        content = form.get("content")

        file_url = None
        file_name = None
        file_size = None
        mime_type = None

        if file and hasattr(file, "filename") and file.filename:
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
            company=project.company,
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
        return serialize_document(doc)

    # JSON body (inline note)
    data = await request.json()
    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    doc = ProjectDocument(
        projectId=project.id,
        company=project.company,
        title=title,
        category=data.get("category", "PRD"),
        description=data.get("description"),
        content=data.get("content"),
        fileUrl=data.get("fileUrl"),
        fileName=data.get("fileName"),
        fileSize=data.get("fileSize"),
        mimeType=data.get("mimeType", "text/markdown" if data.get("content") else None),
        author=data.get("author", project.owner or "Rinzan"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return serialize_document(doc)

@router.get("/api/projects/{id}/documents/{docId}")
def get_document(id: str, docId: str, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == docId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(doc)

@router.patch("/api/projects/{id}/documents/{docId}")
async def update_document(id: str, docId: str, request: Request, db: Session = Depends(get_db)):
    return await update_single_document(docId, request, db)

@router.delete("/api/projects/{id}/documents/{docId}")
def delete_document(id: str, docId: str, db: Session = Depends(get_db)):
    return delete_single_document(docId, db)
