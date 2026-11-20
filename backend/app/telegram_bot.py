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
            self.client = httpx.AsyncClient(timeout=40.0)

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

            # Increment item counter
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
                priority="HIGH" if item_type.upper() == "BUG" else "MEDIUM",
                severity="MAJOR" if item_type.upper() == "BUG" else None,
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
        # Handle Callback Queries (inline keyboard taps)
        if "callback_query" in update:
            await self.handle_callback(update["callback_query"])
            return

        # Handle Messages (text, photo, document)
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

        # 1. Project Selected: "p_AU"
        if data.startswith("p_"):
            project_key = data.replace("p_", "")
            session["data"]["project_key"] = project_key
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
                    "<b>Step 2/5: Select Work Item Type:</b>"
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

            if not stages:
                await self.send_message(
                    chat_id=chat_id,
                    text="⚠️ No workflow stages found for this project. Please configure stages first.",
                )
                session["state"] = "IDLE"
                return

            stage_buttons = []
            row = []
            for s in stages:
                row.append({"text": f"{s.name}", "callback_data": f"s_{s.id}"})
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
                    "<b>Step 3/5: Select Workflow Stage:</b>\n"
                    "Choose which column this item should start in:"
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
                    "<b>Step 4/5: Item Title</b>\n\n"
                    "✏️ Please type the <b>Title / Summary</b> for this item:"
                ),
            )
            return

        # 4. Cancel
        if data == "cancel":
            USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}
            await self.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text="❌ <b>Action cancelled.</b> Send /new to create an item anytime.",
            )
            return

    async def handle_message(self, msg: Dict[str, Any]):
        chat_id = msg["chat"]["id"]
        from_user = msg.get("from", {})
        user_id = from_user.get("id", chat_id)
        text = msg.get("text", "").strip()

        session = USER_SESSIONS.get(user_id, {"state": "IDLE", "data": {}})
        state = session.get("state", "IDLE")

        # Command: /cancel
        if text == "/cancel":
            USER_SESSIONS[user_id] = {"state": "IDLE", "data": {}}
            await self.send_message(
                chat_id, "❌ Creation cancelled. Send /new to start creating a new work item."
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
                "🤖 <b>ProjectFlow Telegram Bot</b>\n\n"
                "Commands:\n"
                "• <b>/new</b> — Create a new Bug, Task, or Feature with stage & attachments\n"
                "• <b>/projects</b> — View list of active projects and direct links\n"
                "• <b>/cancel</b> — Cancel current item creation wizard\n\n"
                "You can also attach screenshots, photos, documents, and voice notes directly when prompted!",
            )
            return

        # Start or /new
        if text in ("/start", "/new") or state == "IDLE":
            projects = self.get_projects()
            if not projects:
                await self.send_message(
                    chat_id,
                    "👋 <b>Welcome to ProjectFlow!</b>\n\n"
                    "No projects found yet. Please create a project on the web first: "
                    f"<a href='{WEB_URL}'>{WEB_URL}</a>",
                )
                return

            buttons = []
            for p in projects:
                buttons.append([{"text": f"{p.name} ({p.key})", "callback_data": f"p_{p.key}"}])
            buttons.append([{"text": "❌ Cancel", "callback_data": "cancel"}])

            USER_SESSIONS[user_id] = {"state": "SELECT_PROJECT", "data": {}}
            await self.send_message(
                chat_id=chat_id,
                text=(
                    "👋 <b>Welcome to ProjectFlow Bot!</b>\n\n"
                    "Let's create a new work item.\n\n"
                    "<b>Step 1/5: Select Project:</b>"
                ),
                reply_markup={"inline_keyboard": buttons},
            )
            return

        # STATE: ENTER_TITLE
        if state == "ENTER_TITLE":
            if not text:
                await self.send_message(chat_id, "Please type a text title for this item:")
                return

            session["data"]["title"] = text
            session["state"] = "ENTER_DESCRIPTION"
            USER_SESSIONS[user_id] = session

            await self.send_message(
                chat_id=chat_id,
                text=(
                    f"📝 <b>Title:</b> {text}\n\n"
                    "<b>Step 5: Description & Attachments</b>\n\n"
                    "Enter a <b>Description</b> (or send /skip to proceed without description):"
                ),
            )
            return

        # STATE: ENTER_DESCRIPTION
        if state == "ENTER_DESCRIPTION":
            description = None if text == "/skip" else text
            session["data"]["description"] = description
            session["state"] = "ATTACH_FILE"
            USER_SESSIONS[user_id] = session

            await self.send_message(
                chat_id=chat_id,
                text=(
                    "📎 <b>Attach File or Screenshot</b>\n\n"
                    "Send a photo, screenshot, document, or audio note now.\n"
                    "Or send <code>/skip</code> to create the item immediately without attachments."
                ),
            )
            return

        # STATE: ATTACH_FILE
        if state == "ATTACH_FILE":
            file_tuple = None

            # Handle File attachment
            if text != "/skip":
                file_id = None
                orig_filename = "attachment"
                mime_type = "application/octet-stream"

                if "photo" in msg:
                    # Telegram sends multiple photo sizes, pick the largest (highest resolution)
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
                    status_msg = await self.send_message(chat_id, "⏳ Downloading attachment...")
                    dl_result = await self.download_file(file_id)
                    if dl_result:
                        _, content = dl_result
                        file_tuple = (orig_filename, content, mime_type)

            # Create the Item now!
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

            if not res:
                await self.send_message(
                    chat_id, "❌ Failed to create work item in database. Please try again."
                )
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
                f"📊 <b>Stage:</b> {p_data['stage_name']}"
                f"{desc_snippet}"
                f"{att_snippet}\n\n"
                f"🔗 <a href='{board_url}'>View on Kanban Board</a>\n\n"
                "Send /new anytime to create another item."
            )

            keyboard = {
                "inline_keyboard": [
                    [{"text": "🌐 Open Kanban Board", "url": board_url}],
                    [{"text": "➕ Create Another Item", "callback_data": f"p_{p_data['project_key']}"}],
                ]
            }
            await self.send_message(chat_id, success_text, reply_markup=keyboard)


async def run_bot_polling(token: str):
    """Long-polling runner for Telegram Bot."""
    bot = TelegramBot(token)
    bot.is_running = True
    offset = 0
    logger.info("Telegram Bot started in polling mode...")

    # Long polling timeout configuration
    timeout_cfg = httpx.Timeout(connect=15.0, read=45.0, write=15.0, pool=15.0)
    bot.client = httpx.AsyncClient(timeout=timeout_cfg)

    # Delete webhook if previously set to ensure polling works
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
                logger.warning(f"Telegram getUpdates response not ok: {data}")
                await asyncio.sleep(2)
        except (httpx.TimeoutException, asyncio.TimeoutError):
            # Normal long-polling cycle completed with no new messages
            continue
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Polling warning: {repr(e)}")
            await asyncio.sleep(3)

    await bot.close()
    logger.info("Telegram Bot stopped.")
