import os
import json
import base64
import re
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger("ai_helper")

SYSTEM_PROMPT = """You are an expert Agile Project Manager and QA Engineer AI.
Analyze the user's input (which can be a voice note, audio recording, screenshot, UI photo, error log, document, or raw text message).
If audio or voice note is provided, carefully transcribe and interpret the spoken words.

Extract and structure a project work item into strict JSON format with the following keys:
- "type": "BUG", "FEATURE", or "TASK". Choose "BUG" if there is an error, crash, freeze, loading issue, visual defect, or unexpected behavior. Choose "FEATURE" if it's a request for new capability, UI enhancement, or user story. Choose "TASK" for chore, setup, or general work.
- "title": A concise, professional title (under 10 words).
- "description": A well-structured description. For bugs, include what happened, screen observed, and steps. For features, include user story and acceptance criteria.
- "priority": "CRITICAL", "HIGH", "MEDIUM", or "LOW".
- "severity": If bug, choose "BLOCKER", "MAJOR", "MINOR", or "TRIVIAL". Otherwise null.
- "summary": A friendly 1-2 sentence summary explaining what you detected and understood from the user's input.

Respond ONLY with valid JSON, without any markdown formatting or code blocks.
"""

async def analyze_with_gemini(
    api_key: str,
    text: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    # Current active multimodal models for Gemini
    models = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash",
    ]
    parts = []

    prompt_text = text if text else "Listen carefully / analyze the attached content, transcribe if audio, and extract the work item details."
    parts.append({"text": f"{SYSTEM_PROMPT}\n\nUser Input / Request: {prompt_text}"})

    if file_bytes and mime_type:
        b64_data = base64.b64encode(file_bytes).decode("utf-8")
        clean_mime = mime_type
        if "ogg" in mime_type or "audio" in mime_type or "opus" in mime_type:
            clean_mime = "audio/ogg"
        elif "png" in mime_type:
            clean_mime = "image/png"
        elif "jpeg" in mime_type or "jpg" in mime_type:
            clean_mime = "image/jpeg"

        parts.append({
            "inline_data": {
                "mime_type": clean_mime,
                "data": b64_data,
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    timeout = httpx.Timeout(connect=15.0, read=45.0, write=15.0, pool=15.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content_parts = candidates[0].get("content", {}).get("parts", [])
                        if content_parts:
                            raw_text = content_parts[0].get("text", "").strip()
                            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                            if json_match:
                                parsed = json.loads(json_match.group(0))
                                logger.info(f"Gemini {model} successfully parsed item: {parsed.get('title')}")
                                return parsed
                            return json.loads(raw_text)
                else:
                    logger.warning(f"Gemini {model} returned HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                logger.error(f"Error calling Gemini {model}: {e}")

    return None

async def analyze_multimodal_content(
    text: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
    original_filename: Optional[str] = None,
) -> Dict[str, Any]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        result = await analyze_with_gemini(gemini_key, text, file_bytes, mime_type)
        if result:
            return result

    # Fallback heuristic if no API key is set or service temporarily unavailable
    title = text[:60] if text else f"Attachment: {original_filename or 'File'}"
    item_type = "TASK"
    if text:
        lower = text.lower()
        if any(w in lower for w in ["bug", "error", "fail", "crash", "broken", "issue", "exception", "defect", "freeze", "stuck"]):
            item_type = "BUG"
        elif any(w in lower for w in ["feature", "add", "allow", "request", "want", "improve", "support", "new"]):
            item_type = "FEATURE"
    elif mime_type and "image" in mime_type:
        item_type = "BUG"
    elif mime_type and "audio" in mime_type:
        item_type = "FEATURE"

    return {
        "type": item_type,
        "title": title.strip() or "New Work Item",
        "description": text or (f"Attached file: {original_filename}" if original_filename else None),
        "priority": "HIGH" if item_type == "BUG" else "MEDIUM",
        "severity": "MAJOR" if item_type == "BUG" else None,
        "summary": "Extracted item details from your message.",
    }
