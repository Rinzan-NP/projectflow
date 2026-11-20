import os
import time
import socket
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Project, Stage, Item, Attachment
from .ai_helper import analyze_multimodal_content

# Force IPv4 resolution for Telegram to prevent dual-stack IPv6 socket hanging
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    if host and "telegram.org" in str(host):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _getaddrinfo_ipv4

logger = logging.getLogger("telegram_bot")
logger.setLevel(logging.INFO)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

WEB_URL = os.getenv("WEB_URL", "https://project.rinzan.me")

# In-memory user state machine: user_id -> { "state": str, "data": dict }
USER_SESSIONS: Dict[int, Dict[str, Any]] = {}

class TelegramBot:
    def __init__(self, token: str):
        self.token = token
        self.api_url = f"https://api.telegram.org/bot{token}"
        self.client: Optional[httpx.AsyncClient] = None
        self.is_running = False

    async def init_client(self):
        if not self.client or self.client.is_closed:
            timeout_cfg = httpx.Timeout(connect=15.0, read=45.0, write=15.0, pool=15.0)
            self.client = httpx.AsyncClient(timeout=timeout_cfg)

    async def close(self):
        self.is_running = False
        if self.client and not self.client.is_closed:
            await self.client.aclose()

    async def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "HTML",
    ):
        await self.init_client()
        payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        try:
            resp = await self.client.post(f"{self.api_url}/sendMessage", json=payload)
            return resp.json()
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return None

    async def edit_message_text(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "HTML",
    ):
        await self.init_client()
        payload = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": parse_mode,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        try:
            resp = await self.client.post(f"{self.api_url}/editMessageText", json=payload)
            return resp.json()
        except Exception as e:
            logger.error(f"Error editing message: {e}")
            return None

    async def answer_callback_query(self, callback_query_id: str, text: Optional[str] = None):
        await self.init_client()
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
        try:
            await self.client.post(f"{self.api_url}/answerCallbackQuery", json=payload)
        except Exception as e:
            logger.error(f"Error answering callback query: {e}")

    async def download_file(self, file_id: str) -> Optional[tuple[str, bytes]]:
        """Fetch file metadata and download bytes from Telegram servers."""
        await self.init_client()
        try:
            resp = await self.client.get(f"{self.api_url}/getFile", params={"file_id": file_id})
            data = resp.json()
            if not data.get("ok"):
                return None
            file_path = data["result"]["file_path"]
            download_url = f"https://api.telegram.org/file/bot{self.token}/{file_path}"
            dl_resp = await self.client.get(download_url)
            if dl_resp.status_code == 200:
                filename = os.path.basename(file_path)
                return filename, dl_resp.content
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {e}")
        return None

    def get_projects(self) -> list:
        db: Session = SessionLocal()
        try:
            return db.query(Project).order_by(Project.name.asc()).all()
        finally:
            db.close()

    def get_project_stages(self, project_key: str) -> tuple[Optional[Project], list]:
        db: Session = SessionLocal()
        try:
            p = db.query(Project).filter(Project.key == project_key.upper()).first()
            if not p:
                return None, []
            stages = sorted(p.stages, key=lambda s: s.order)
            return p, stages
        finally:
            db.close()

    def create_work_item(
        self,
        project_key: str,
        stage_id: str,
        title: str,
        item_type: str = "TASK",
        description: Optional[str] = None,
        priority: str = "MEDIUM",
        severity: Optional[str] = None,
        file_tuple: Optional[tuple[str, bytes, str]] = None, # (filename, bytes, mime_type)
    ) -> Optional[tuple[Item, Optional[Attachment]]]:
        db: Session = SessionLocal()
        try:
            project = db.query(Project).filter(Project.key == project_key.upper()).first()
            if not project:
                return None

            stage = db.query(Stage).filter(Stage.id == stage_id).first()
            if not stage:
                return None

            project.itemCounter += 1
            item_num = project.itemCounter
            human_id = f"{project.key}-{item_num}"

            last_item = (
                db.query(Item)
                .filter(Item.stageId == stage.id)
                .order_by(Item.order.desc())
                .first()
            )
            order = (last_item.order + 1.0) if last_item else 1.0
            completed_at = datetime.utcnow() if stage.isDoneStage else None

            item = Item(
                humanId=human_id,
                itemNumber=item_num,
                projectId=project.id,
                stageId=stage.id,
                type=item_type.upper(),
                title=title.strip(),
                description=description.strip() if description else None,
                priority=priority or ("HIGH" if item_type.upper() == "BUG" else "MEDIUM"),
                severity=severity if item_type.upper() == "BUG" else None,
                source="CLIENT_REPORTED" if item_type.upper() == "BUG" else None,
                order=order,
                completedAt=completed_at,
            )
            db.add(item)
            db.flush()

            attachment = None
            if file_tuple:
                orig_name, content_bytes, mime = file_tuple
                safe_name = "".join(c for c in orig_name if c.isalnum() or c in "._- ")
                unique_name = f"{int(time.time())}-{safe_name}"
                save_path = os.path.join(UPLOAD_DIR, unique_name)
                with open(save_path, "wb") as f:
                    f.write(content_bytes)

                url = f"/api/uploads/{unique_name}"
                attachment = Attachment(
                    itemId=item.id,
                    name=orig_name,
                    url=url,
                    sizeBytes=len(content_bytes),
                    mimeType=mime,
                )
                db.add(attachment)

            db.commit()
            db.refresh(item)
            if attachment:
                db.refresh(attachment)
            return item, attachment
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating work item: {e}")
            return None
        finally:
            db.close()

    async def handle_update(self, update: Dict[str, Any]):
        if "callback_query" in update:
            await self.handle_callback(update["callback_query"])
            return

        if "message" in update:
            await self.handle_message(update["message"])

    async def handle_callback(self, cb: Dict[str, Any]):
        cb_id = cb["id"]
        from_user = cb["from"]
        user_id = from_user["id"]
        data = cb.get("data", "")
        message = cb.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")

        await self.answer_callback_query(cb_id)

        session = USER_SESSIONS.get(user_id, {"state": "IDLE", "data": {}})

        # Cancel
        if data == "cancel":
            USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}
            await self.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text="❌ <b>Action cancelled.</b> Send a screenshot, audio note, or /new anytime.",
            )
            return

        # 1. Project Selected: "p_AU"
        if data.startswith("p_"):
            project_key = data.replace("p_", "")
            session["data"]["project_key"] = project_key

            # If title is already provided (e.g. from AI Multimodal analysis), skip type selection and ask stage directly!
            if session["data"].get("title"):
                session["state"] = "SELECT_STAGE"
                USER_SESSIONS[user_id] = session

                _, stages = self.get_project_stages(project_key)
                if not stages:
                    await self.send_message(chat_id, "⚠️ No stages found for this project.")
                    return

                stage_buttons = []
                row = []
                for s in stages:
                    row.append({"text": s.name, "callback_data": f"s_{s.id}"})
                    if len(row) == 2:
                        stage_buttons.append(row)
                        row = []
                if row:
                    stage_buttons.append(row)
                stage_buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])

                type_icons = {"BUG": "🐛 Bug", "FEATURE": "✨ Feature", "TASK": "📋 Task"}
                display_type = type_icons.get(session["data"].get("item_type"), "Item")

                await self.edit_message_text(
                    chat_id=chat_id,
                    message_id=message_id,
                    text=(
                        f"📁 <b>Project:</b> <code>{project_key}</code>\n"
                        f"🏷 <b>Type:</b> {display_type}\n"
                        f"📌 <b>Title:</b> <b>{session['data'].get('title')}</b>\n\n"
                        "<b>👉 Select Workflow Stage to Add To:</b>"
                    ),
                    reply_markup={"inline_keyboard": stage_buttons},
                )
                return

            # Otherwise, standard manual flow: ask Type
            session["state"] = "SELECT_TYPE"
            USER_SESSIONS[user_id] = session

            keyboard = {
                "inline_keyboard": [
                    [
                        {"text": "🐛 Bug", "callback_data": "t_BUG"},
                        {"text": "✨ Feature", "callback_data": "t_FEATURE"},
                        {"text": "📋 Task", "callback_data": "t_TASK"},
                    ],
                    [{"text": "❌ Cancel", "callback_data": "cancel"}],
                ]
            }
            await self.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=(
                    f"📁 <b>Project Selected:</b> <code>{project_key}</code>\n\n"
                    "<b>Select Work Item Type:</b>"
                ),
                reply_markup=keyboard,
            )
            return

        # 2. Type Selected: "t_BUG"
        if data.startswith("t_"):
            item_type = data.replace("t_", "")
            session["data"]["item_type"] = item_type
            session["state"] = "SELECT_STAGE"
            USER_SESSIONS[user_id] = session

            project_key = session["data"].get("project_key", "")
            _, stages = self.get_project_stages(project_key)

            stage_buttons = []
            row = []
            for s in stages:
                row.append({"text": s.name, "callback_data": f"s_{s.id}"})
                if len(row) == 2:
                    stage_buttons.append(row)
                    row = []
            if row:
                stage_buttons.append(row)
            stage_buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])

            type_icons = {"BUG": "🐛 Bug", "FEATURE": "✨ Feature", "TASK": "📋 Task"}
            display_type = type_icons.get(item_type, item_type)

            await self.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=(
                    f"📁 <b>Project:</b> <code>{project_key}</code>\n"
                    f"🏷 <b>Type:</b> {display_type}\n\n"
                    "<b>Select Workflow Stage:</b>"
                ),
                reply_markup={"inline_keyboard": stage_buttons},
            )
            return

        # 3. Stage Selected: "s_<stage_id>"
        if data.startswith("s_"):
            stage_id = data.replace("s_", "")
            project_key = session["data"].get("project_key", "")
            _, stages = self.get_project_stages(project_key)
            stage_name = next((s.name for s in stages if s.id == stage_id), "Selected Stage")

            session["data"]["stage_id"] = stage_id
            session["data"]["stage_name"] = stage_name

            # If title is ALREADY extracted (from AI Multimodal Analysis), create immediately!
            if session["data"].get("title"):
                p_data = session["data"]
                res = self.create_work_item(
                    project_key=p_data["project_key"],
                    stage_id=p_data["stage_id"],
                    title=p_data["title"],
                    item_type=p_data.get("item_type", "TASK"),
                    description=p_data.get("description"),
                    priority=p_data.get("priority", "MEDIUM"),
                    severity=p_data.get("severity"),
                    file_tuple=p_data.get("file_tuple"),
                )

                USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}

                if not res:
                    await self.send_message(chat_id, "❌ Failed to create item in database.")
                    return

                item, attachment = res
                type_icons = {"BUG": "🐛 Bug", "FEATURE": "✨ Feature", "TASK": "📋 Task"}
                type_label = type_icons.get(item.type, item.type)

                desc_snippet = (
                    f"\n📝 <b>Description:</b> {item.description}"
                    if item.description
                    else ""
                )
                att_snippet = (
                    f"\n📎 <b>Attachment:</b> {attachment.name} ({(attachment.sizeBytes / 1024):.1f} KB)"
                    if attachment
                    else ""
                )
                board_url = f"{WEB_URL}/projects/{p_data['project_key']}/board"

                success_text = (
                    f"✅ <b>{type_label} Created Successfully!</b>\n\n"
                    f"🏷 <b>ID:</b> <code>{item.humanId}</code>\n"
                    f"📌 <b>Title:</b> <b>{item.title}</b>\n"
                    f"📁 <b>Project:</b> <code>{p_data['project_key']}</code>\n"
                    f"📊 <b>Stage:</b> {stage_name}"
                    f"{desc_snippet}"
                    f"{att_snippet}\n\n"
                    f"🔗 <a href='{board_url}'>View on Kanban Board</a>\n\n"
                    "Send another image, audio note, or text message anytime!"
                )

                keyboard = {
                    "inline_keyboard": [
                        [{"text": "🌐 Open Kanban Board", "url": board_url}],
                    ]
                }
                await self.edit_message_text(
                    chat_id=chat_id,
                    message_id=message_id,
                    text=success_text,
                    reply_markup=keyboard,
                )
                return

            # Otherwise (manual creation flow), prompt for title
            session["state"] = "ENTER_TITLE"
            USER_SESSIONS[user_id] = session

            type_icons = {"BUG": "🐛 Bug", "FEATURE": "✨ Feature", "TASK": "📋 Task"}
            display_type = type_icons.get(session["data"].get("item_type"), "Item")

            await self.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=(
                    f"📁 <b>Project:</b> <code>{project_key}</code>\n"
                    f"🏷 <b>Type:</b> {display_type}\n"
                    f"📊 <b>Stage:</b> {stage_name}\n\n"
                    "✏️ Please type the <b>Title / Summary</b> for this item:"
                ),
            )
            return

    async def handle_message(self, msg: Dict[str, Any]):
        chat_id = msg["chat"]["id"]
        from_user = msg.get("from", {})
        user_id = from_user.get("id", chat_id)
        text = msg.get("text", "").strip()
        caption = msg.get("caption", "").strip()

        session = USER_SESSIONS.get(user_id, {"state": "IDLE", "data": {}})
        state = session.get("state", "IDLE")

        # Command: /cancel
        if text == "/cancel":
            USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}
            await self.send_message(
                chat_id, "❌ Action cancelled. Send any screenshot, audio note, or /new to start again."
            )
            return

        # Command: /projects
        if text == "/projects":
            projects = self.get_projects()
            if not projects:
                await self.send_message(chat_id, "No active projects found.")
                return
            lines = ["<b>📁 Active Projects:</b>\n"]
            for p in projects:
                lines.append(f"• <b>{p.name}</b> (<code>{p.key}</code>) — {p.company or 'General'}")
                lines.append(f"  🔗 <a href='{WEB_URL}/projects/{p.key}/board'>Open Board</a>\n")
            await self.send_message(chat_id, "\n".join(lines))
            return

        # Command: /help
        if text == "/help":
            await self.send_message(
                chat_id,
                "🤖 <b>ProjectFlow Multimodal AI Bot</b>\n\n"
                "You can interact with me in two ways:\n\n"
                "1. 🧠 <b>Multimodal AI Mode (Zero friction):</b>\n"
                "• Send a <b>Screenshot or Photo</b> of a bug or UI\n"
                "• Send a <b>Voice Note or Audio message</b> describing a task or feature\n"
                "• Send a <b>Document, error log, or PDF</b>\n"
                "• Or just type a <b>Message</b> explaining what to build or fix\n\n"
                "AI will analyze the content, auto-generate title & description, attach the file, and ask you which Project & Stage to put it in!\n\n"
                "2. 📋 <b>Step-by-Step Mode:</b>\n"
                "• Send <b>/new</b> to follow manual step-by-step wizard\n"
                "• Send <b>/projects</b> to see all projects and board links\n"
                "• Send <b>/cancel</b> to reset",
            )
            return

        # Explicit /new wizard
        if text == "/new":
            projects = self.get_projects()
            if not projects:
                await self.send_message(
                    chat_id,
                    f"No projects found yet. Please create one on <a href='{WEB_URL}'>{WEB_URL}</a>",
                )
                return

            buttons = []
            for p in projects:
                buttons.append([{"text": f"{p.name} ({p.key})", "callback_data": f"p_{p.key}"}])
            buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])

            USER_SESSIONS[user_id] = {"state": "SELECT_PROJECT", "data": {}}
            await self.send_message(
                chat_id=chat_id,
                text="<b>Step 1/5: Select Project:</b>",
                reply_markup={"inline_keyboard": buttons},
            )
            return

        # If user sends media at any point (unless in ATTACH_FILE state), treat as Multimodal AI intake
        has_media = any(k in msg for k in ("photo", "voice", "audio", "document"))

        # If in interactive text-entry states without media:
        if state == "ENTER_TITLE" and not has_media:
            if not text:
                await self.send_message(chat_id, "Please type a title for this item:")
                return
            session["data"]["title"] = text
            session["state"] = "ENTER_DESCRIPTION"
            USER_SESSIONS[user_id] = session
            await self.send_message(
                chat_id,
                f"📝 <b>Title:</b> {text}\n\nNow enter a <b>Description</b> (or send /skip):",
            )
            return

        if state == "ENTER_DESCRIPTION" and not has_media:
            session["data"]["description"] = None if text == "/skip" else text
            session["state"] = "ATTACH_FILE"
            USER_SESSIONS[user_id] = session
            await self.send_message(
                chat_id,
                "📎 <b>Attach File:</b> Send a photo, document, or audio (or /skip to finish):",
            )
            return

        if state == "ATTACH_FILE":
            file_tuple = None
            if text != "/skip":
                file_id = None
                orig_filename = "attachment"
                mime_type = "application/octet-stream"

                if "photo" in msg:
                    photo = msg["photo"][-1]
                    file_id = photo["file_id"]
                    orig_filename = f"screenshot_{int(time.time())}.jpg"
                    mime_type = "image/jpeg"
                elif "document" in msg:
                    doc = msg["document"]
                    file_id = doc["file_id"]
                    orig_filename = doc.get("file_name", f"doc_{int(time.time())}")
                    mime_type = doc.get("mime_type", "application/octet-stream")
                elif "voice" in msg:
                    v = msg["voice"]
                    file_id = v["file_id"]
                    orig_filename = f"voice_note_{int(time.time())}.ogg"
                    mime_type = "audio/ogg"

                if file_id:
                    dl = await self.download_file(file_id)
                    if dl:
                        _, content = dl
                        file_tuple = (orig_filename, content, mime_type)

            p_data = session["data"]
            res = self.create_work_item(
                project_key=p_data["project_key"],
                stage_id=p_data["stage_id"],
                title=p_data["title"],
                item_type=p_data.get("item_type", "TASK"),
                description=p_data.get("description"),
                file_tuple=file_tuple,
            )
            USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}
            if res:
                item, attachment = res
                board_url = f"{WEB_URL}/projects/{p_data['project_key']}/board"
                await self.send_message(
                    chat_id,
                    f"✅ <b>Created {item.humanId}: {item.title}</b>\n🔗 <a href='{board_url}'>View Board</a>",
                )
            return

        # =========================================================================
        # MULTIMODAL AI INTAKE (State == IDLE or unprompted media / message)
        # =========================================================================
        file_bytes = None
        file_mime = None
        orig_filename = None
        media_type_label = "message"

        if "photo" in msg:
            media_type_label = "screenshot"
            photo = msg["photo"][-1]
            dl = await self.download_file(photo["file_id"])
            if dl:
                orig_filename, file_bytes = dl
                file_mime = "image/jpeg"
        elif "voice" in msg:
            media_type_label = "voice note"
            v = msg["voice"]
            dl = await self.download_file(v["file_id"])
            if dl:
                orig_filename = f"voice_{int(time.time())}.ogg"
                _, file_bytes = dl
                file_mime = "audio/ogg"
        elif "audio" in msg:
            media_type_label = "audio"
            aud = msg["audio"]
            dl = await self.download_file(aud["file_id"])
            if dl:
                orig_filename = aud.get("file_name", f"audio_{int(time.time())}.mp3")
                _, file_bytes = dl
                file_mime = aud.get("mime_type", "audio/mpeg")
        elif "document" in msg:
            media_type_label = "document"
            doc = msg["document"]
            dl = await self.download_file(doc["file_id"])
            if dl:
                orig_filename = doc.get("file_name", "document")
                _, file_bytes = dl
                file_mime = doc.get("mime_type", "application/octet-stream")

        user_content_text = caption if caption else text

        if not file_bytes and not user_content_text:
            return

        status_msg = await self.send_message(
            chat_id, f"🧠 <i>Analyzing {media_type_label} with Gemini Multimodal AI...</i>"
        )

        ai_result = await analyze_multimodal_content(
            text=user_content_text,
            file_bytes=file_bytes,
            mime_type=file_mime,
            original_filename=orig_filename,
        )

        projects = self.get_projects()
        if not projects:
            await self.send_message(chat_id, "No active projects available.")
            return

        # Store in session
        file_tuple = (orig_filename, file_bytes, file_mime) if (file_bytes and orig_filename and file_mime) else None

        USER_SESSIONS[user_id] = {
            "state": "SELECT_PROJECT",
            "data": {
                "title": ai_result.get("title", "New Work Item"),
                "description": ai_result.get("description"),
                "item_type": ai_result.get("type", "TASK"),
                "priority": ai_result.get("priority", "MEDIUM"),
                "severity": ai_result.get("severity"),
                "file_tuple": file_tuple,
            },
        }

        # Build Project selector buttons
        buttons = []
        for p in projects:
            buttons.append([{"text": f"{p.name} ({p.key})", "callback_data": f"p_{p.key}"}])
        buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])

        type_icons = {"BUG": "🐛 Bug", "FEATURE": "✨ Feature", "TASK": "📋 Task"}
        display_type = type_icons.get(ai_result.get("type"), "Item")

        analysis_card = (
            f"🧠 <b>AI Content Analysis:</b>\n\n"
            f"🏷 <b>Detected Type:</b> {display_type}\n"
            f"📌 <b>Title:</b> <b>{ai_result.get('title')}</b>\n"
            f"📝 <b>Description:</b> <i>{ai_result.get('description', '')[:250]}</i>\n"
            + (f"📎 <b>Attached File:</b> {orig_filename}\n" if orig_filename else "")
            + f"\n👉 <b>Which project should this be added to?</b>"
        )

        status_msg_id = status_msg.get("result", {}).get("message_id") if status_msg else None
        if status_msg_id:
            res = await self.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg_id,
                text=analysis_card,
                reply_markup={"inline_keyboard": buttons},
            )
            if not res:
                await self.send_message(
                    chat_id=chat_id,
                    text=analysis_card,
                    reply_markup={"inline_keyboard": buttons},
                )
        else:
            await self.send_message(
                chat_id=chat_id,
                text=analysis_card,
                reply_markup={"inline_keyboard": buttons},
            )


async def run_bot_polling(token: str):
    """Long-polling runner for Telegram Bot."""
    bot = TelegramBot(token)
    bot.is_running = True
    offset = 0
    logger.info("Telegram Bot started in polling mode...")

    timeout_cfg = httpx.Timeout(connect=15.0, read=45.0, write=15.0, pool=15.0)
    bot.client = httpx.AsyncClient(timeout=timeout_cfg)

    try:
        await bot.client.post(f"{bot.api_url}/deleteWebhook")
    except Exception:
        pass

    while bot.is_running:
        try:
            resp = await bot.client.get(
                f"{bot.api_url}/getUpdates",
                params={"offset": offset, "timeout": 20},
            )
            data = resp.json()
            if data.get("ok"):
                for update in data.get("result", []):
                    offset = max(offset, update["update_id"] + 1)
                    asyncio.create_task(bot.handle_update(update))
            else:
                await asyncio.sleep(2)
        except (httpx.TimeoutException, asyncio.TimeoutError):
            continue
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Polling warning: {repr(e)}")
            await asyncio.sleep(3)

    await bot.close()
    logger.info("Telegram Bot stopped.")
