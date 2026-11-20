#!/usr/bin/env python3
"""
Standalone Telegram Bot Runner for ProjectFlow
Usage:
    export TELEGRAM_BOT_TOKEN="your_token_here"
    python3 scripts/run_telegram_bot.py

Or pass token directly as argument:
    python3 scripts/run_telegram_bot.py "your_token_here"
"""
import os
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path so imports work
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.telegram_bot import run_bot_polling

def main():
    token = sys.argv[1] if len(sys.argv) > 1 else os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN is missing!")
        print("Please provide it as an argument or set TELEGRAM_BOT_TOKEN in your environment.")
        print("\nExample:")
        print("    python3 scripts/run_telegram_bot.py 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ")
        sys.exit(1)

    print("🤖 Starting ProjectFlow Telegram Bot...")
    print("Press Ctrl+C to stop.")
    try:
        asyncio.run(run_bot_polling(token))
    except KeyboardInterrupt:
        print("\n👋 Bot stopped gracefully.")

if __name__ == "__main__":
    main()
