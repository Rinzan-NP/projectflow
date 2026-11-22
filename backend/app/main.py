import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal
from .models import Project, Stage
from .routers.projects import DEFAULT_STAGES
from .routers import projects, stages, items, documents, uploads, dev_kit, telegram
from .telegram_bot import run_bot_polling

logger = logging.getLogger("projectflow")

from sqlalchemy import text

# Safe database initialization
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        try:
            with engine.connect() as conn:
                conn.execute(text('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT \'MEDIUM\''))
                conn.commit()
        except Exception as e:
            logger.warning(f"Migration note: {e}")
        auto_seed_if_empty()
    except Exception as e:
        logger.error(f"DB initialization note: {e}")

def auto_seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Project).count() == 0:
            logger.info("Database is empty. Auto-seeding default projects...")
            default_projects = [
                {"name": "AutoPioneer", "key": "AU", "company": "Solinify", "description": "Automated workflow and pioneer operations platform.", "color": "#f43f5e"},
                {"name": "Account Bloom", "key": "AB", "company": "Solinify", "description": "Finance and client accounting management system.", "color": "#64748b"},
                {"name": "Quality ERP", "key": "QE", "company": "Solinify", "description": "Enterprise resource planning and quality tracking.", "color": "#06b6d4"},
                {"name": "First Medical Pulse", "key": "FMP", "company": "Solinify", "description": "Healthcare patient records and triage system.", "color": "#06b6d4"},
                {"name": "Cravio", "key": "G-1", "company": "Gingr", "description": "Culinary logistics and order fulfillment hub.", "color": "#10b981"},
            ]
            for p in default_projects:
                proj = Project(
                    name=p["name"],
                    key=p["key"],
                    company=p["company"],
                    description=p["description"],
                    color=p["color"],
                    icon="FolderKanban",
                    status="ACTIVE",
                    owner="Rinzan",
                    members="Sam Taylor,Jordan Lee",
                    itemCounter=0,
                )
                db.add(proj)
                db.flush()
                for s in DEFAULT_STAGES:
                    stage = Stage(
                        projectId=proj.id,
                        name=s["name"],
                        order=s["order"],
                        color=s["color"],
                        isDoneStage=s["isDoneStage"],
                        wipLimit=s["wipLimit"],
                    )
                    db.add(stage)
            db.commit()
            logger.info("Auto-seeding completed.")
    except Exception as e:
        db.rollback()
        logger.error(f"Auto-seed error: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB safely on startup
    init_db()

    # Startup: Start Telegram Bot background task if token is set
    bot_task = None
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token:
        logger.info("TELEGRAM_BOT_TOKEN detected. Starting background Telegram Bot runner...")
        bot_task = asyncio.create_task(run_bot_polling(token))
    else:
        logger.info("TELEGRAM_BOT_TOKEN not set. Telegram Bot is idle (can be started anytime via env).")

    yield

    # Shutdown: Clean up bot task
    if bot_task and not bot_task.done():
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="ProjectFlow API",
    description="High-performance FastAPI backend for ProjectFlow Project Manager",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()}
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
app.include_router(telegram.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ProjectFlow FastAPI Backend"}
