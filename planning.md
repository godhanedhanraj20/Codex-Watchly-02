# Mirror-Leech Telegram Bot - Planning Document

## 1. Objective and Philosophy
This document outlines the architecture and implementation plan for a lightweight, modular Mirror-Leech Telegram Bot. Based on the proven `anasty17` reference architecture, this design strips away unnecessary complexity to provide a streamlined, maintainable bot optimized for personal/private usage.

**Core Philosophy:** Keep it simple, maintainable, and avoid over-engineering.

---

## 2. High-Level Architecture
The bot operates using an asynchronous task-based architecture.

**Core Components:**
- **Telegram Interface (Pyrogram):** Handles user commands, authorization, and progress updates.
- **Task Queue & Manager:** Manages active downloads/uploads to prevent system overload.
- **Download Engines:**
  - `aria2` (via RPC) for HTTP/HTTPS direct links and Torrents.
  - `yt-dlp` for YouTube and other supported media sites.
- **Processing Engine:** Handles file splitting (for Telegram limits), zipping/unzipping, and basic duplicate detection.
- **Upload Engines:**
  - **Leech:** Telegram API for direct uploads.
  - **Mirror:** Google Drive API (via service accounts or OAuth).
- **Storage:** Minimal MongoDB for user authorization and simple settings.

---

## 3. Simplified Module Breakdown

### `bot/` (Core Application)
- **`__main__.py`**: Entry point. Initializes the bot, loads config, and starts the event loop.
- **`config.py`**: Environment variable loader and configuration manager.
- **`database/`**:
  - `mongodb.py`: Minimal MongoDB wrapper for user auth and settings.
- **`handlers/`**:
  - `mirror.py`: Handles `/mirror` commands.
  - `leech.py`: Handles `/leech` commands.
  - `status.py`: Handles `/status` and task cancellation.
  - `auth.py`: Handles `/authorize` and `/unauthorize` for private access.
- **`engines/`**:
  - `download/`:
    - `aria2_listener.py`: Interacts with aria2 RPC.
    - `ytdlp_helper.py`: Wraps yt-dlp execution.
  - `upload/`:
    - `tg_uploader.py`: Telegram file uploader with splitting logic.
    - `gdrive_uploader.py`: Google Drive uploader.
- **`utils/`**:
  - `progress.py`: Generates and updates Telegram status messages.
  - `fs_utils.py`: File manipulation, splitting, and duplicate detection.
  - `logger.py`: Centralized logging setup.

---

## 4. Execution Lifecycle (Download → Process → Upload)

1. **Command Reception:** User sends `/mirror [link]` or `/leech [link]`.
2. **Authorization & Validation:**
   - Check if the user is authorized via MongoDB.
   - Validate the link type (Direct, Torrent, YouTube).
   - Check for duplicates (basic hash/name check in GDrive).
3. **Queueing:** Task is added to the internal queue. Bot replies with "Task added...".
4. **Downloading:**
   - Appropriate engine (`aria2` or `yt-dlp`) starts downloading.
   - Progress bar message is spawned and updated periodically.
5. **Processing:**
   - If Leech: File is checked against Telegram limits (2GB/4GB). If it exceeds the limit, it is split using `fs_utils`.
6. **Uploading:**
   - **Mirror:** Uploads to Google Drive using `gdrive_uploader`.
   - **Leech:** Uploads to Telegram using `tg_uploader`.
   - Progress bar continues to update with upload status.
7. **Cleanup:** Downloaded files are deleted from local storage. Final success/failure message is sent.

---

## 5. Command Design

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/mirror` | `[URL/Torrent/Magnet]` | Downloads the source and uploads it to Google Drive. |
| `/leech` | `[URL/Torrent/Magnet]` | Downloads the source and uploads it to Telegram (splits if >2GB). |
| `/status` | *None* | Shows active downloads/uploads with progress bars. |
| `/cancel` | `[Task ID]` | Cancels a specific ongoing task. |
| `/authorize` | `[User ID]` | (Admin only) Grants a user access to the bot. |
| `/unauthorize`| `[User ID]` | (Admin only) Revokes access. |

---

## 6. Database Schema (Minimal MongoDB)

**Collection: `users`**
```json
{
  "_id": 123456789,           // Telegram User ID
  "is_authorized": true,      // Authorization status
  "is_admin": false           // Admin privileges
}
```

**Collection: `settings`** (Optional for global state)
```json
{
  "gdrive_folder_id": "root", // Default upload destination
  "leech_split_size": 2000    // MB
}
```

---

## 7. Deployment Strategy (Google Cloud - Free Tier Friendly)

**Prerequisites:**
- Google Cloud Platform (GCP) Account with an e2-micro instance (free tier eligible).
- Docker and Docker Compose installed on the VM.
- Telegram Bot Token from BotFather.
- Google Drive API credentials (credentials.json).
- MongoDB URI (MongoDB Atlas free tier recommended).

**Deployment Steps:**
1. **VM Provisioning:** Spin up an `e2-micro` instance on GCP (Debian/Ubuntu).
2. **Environment Setup:** Clone the repository and copy `.env.example` to `.env`.
3. **Configuration:** Fill in `.env` variables:
   - `BOT_TOKEN`
   - `API_ID` & `API_HASH`
   - `MONGO_URI`
   - `OWNER_ID`
4. **Aria2 Setup:** Ensure `aria2c` configuration (`aria2.conf`) is tuned for low memory usage.
5. **Docker Compose:** Create a `docker-compose.yml` to bundle the bot and required dependencies.
6. **Launch:** Run `docker-compose up -d --build`.
7. **Maintenance:** Set up a cron job or script to clear the `/downloads` directory periodically in case of failed cleanup.
