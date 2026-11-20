import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import projects, stages, items, documents, uploads, dev_kit, telegram
from .telegram_bot import run_bot_polling

logger = logging.getLogger("projectflow")

# Create tables if not exist
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
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
