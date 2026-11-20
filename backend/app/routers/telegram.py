import os
import socket
from fastapi import APIRouter, Request, HTTPException
import httpx
from ..telegram_bot import TelegramBot

# Force IPv4 resolution for Telegram to prevent dual-stack IPv6 socket hanging
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    if host and "telegram.org" in str(host):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _getaddrinfo_ipv4

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
        timeout = httpx.Timeout(connect=10.0, read=20.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
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
                "status_code": resp.status_code,
                "error": data.get("description", "Telegram API returned ok: false"),
            }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "error": repr(e),
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
