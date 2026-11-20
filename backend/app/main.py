import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import projects, stages, items, documents, uploads, dev_kit

# Create tables if not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProjectFlow API",
    description="High-performance FastAPI backend for ProjectFlow Project Manager",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
upload_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Include Routers
app.include_router(projects.router)
app.include_router(stages.router)
app.include_router(items.router)
app.include_router(documents.router)
app.include_router(uploads.router)
app.include_router(dev_kit.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ProjectFlow FastAPI Backend"}
