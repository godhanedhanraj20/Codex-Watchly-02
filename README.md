# Watchly V1

Minimal MVP app: one host logs in with Google, creates a room, and guests watch the same video in sync via polling.

## Requirements

- Node.js >= 18
- Google OAuth client credentials

## Local setup

1. Copy env file:
   ```bash
   cp .env.example .env
   ```
2. Fill `.env` values:
   - `SESSION_SECRET` (required)
   - `BASE_URL` (usually `http://localhost:3000`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - Optional `OAUTH_CALLBACK_URL`

### OAuth callback default behavior

If `OAUTH_CALLBACK_URL` is empty, the app automatically uses:

```text
${BASE_URL}/auth/google/callback
```

3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Start app:
   ```bash
   npm start
   ```

Open: `http://localhost:3000`

## Heroku deploy

1. Create app:
   ```bash
   heroku create <your-app-name>
   ```
2. Set config vars (same keys as `.env.example`):
   ```bash
   heroku config:set SESSION_SECRET=... BASE_URL=https://<your-app-name>.herokuapp.com GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... NODE_ENV=production
   ```
   Optional:
   ```bash
   heroku config:set OAUTH_CALLBACK_URL=https://<your-app-name>.herokuapp.com/auth/google/callback
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```
4. In Google Cloud Console, ensure authorized redirect URI exactly matches:
   ```text
   https://<your-app-name>.herokuapp.com/auth/google/callback
   ```

## Quick Google OAuth setup

1. Go to **Google Cloud Console**.
2. Create/select project.
3. Open **APIs & Services → Credentials**.
4. Create **OAuth 2.0 Client ID** (Web application).
5. Add authorized redirect URI:
   - Local: `http://localhost:3000/auth/google/callback`
   - Heroku: `https://<your-app-name>.herokuapp.com/auth/google/callback`
6. Copy client ID/secret into env vars.

## Notes

- Rooms are stored in memory using a `Map`.
- Restarting the server clears all rooms and participants.
- This is intentionally a simple v1 (no Redis, no scaling, no WebSocket).
- Host validates selected/manual video URLs before syncing playback state to guests.
- If a Drive source fails validation, it is not synced to guests until validation succeeds.
- For Drive playback, ensure files are shared appropriately; guest page now shows explicit source load failures and retries failed URLs after a short cooldown.
