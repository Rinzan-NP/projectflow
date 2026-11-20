import os
from fastapi import APIRouter, Request, HTTPException
import httpx
from ..telegram_bot import TelegramBot

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

@router.get("/status")
async def telegram_status():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return {
            "configured": False,
            "message": "TELEGRAM_BOT_TOKEN is not configured in environment variables or .env",
            "bot": None,
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            data = resp.json()
            if data.get("ok"):
                return {
                    "configured": True,
                    "connected": True,
                    "bot": data["result"],
                }
            return {
                "configured": True,
                "connected": False,
                "error": data.get("description", "Invalid bot token"),
            }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "error": str(e),
        }

@router.post("/webhook")
async def telegram_webhook(request: Request):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise HTTPException(status_code=400, detail="Bot token not configured")

    try:
        update = await request.json()
        bot = TelegramBot(token)
        await bot.handle_update(update)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
