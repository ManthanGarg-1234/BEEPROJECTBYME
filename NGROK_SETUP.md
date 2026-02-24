# NgRok Temporary Deployment Guide

> **Scope**: Temporary public access for development/demo only.  
> No permanent infra changes. Existing project code is unchanged except a one-line CORS guard.

---

## How it works

```
Browser ──► https://abc.ngrok-free.app ──► ngrok tunnel ──► localhost:5000 (Express + Socket.io)
                                                                        │
                                                               client/dist (static files)
```

ngrok creates a public HTTPS tunnel to your locally running Express server.  
The server already serves the built React frontend from `client/dist`, so **one tunnel covers everything** — REST API, Socket.io, and static files.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| ngrok | latest | https://ngrok.com/download |
| ngrok account | free | https://dashboard.ngrok.com/signup |

---

## One-time setup

### 1. Install ngrok

**Windows (winget)**
```powershell
winget install ngrok.ngrok
```

**Or download directly** from https://ngrok.com/download, extract, and add to PATH.

### 2. Authenticate ngrok

```powershell
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

Get your token from https://dashboard.ngrok.com/get-started/your-authtoken.

---

## Per-session steps

### Step 1 — Copy and configure server environment

```powershell
# From project root
Copy-Item server\.env.example server\.env
```

Edit `server/.env` — only these keys are required to get started:

```
MONGO_URI=mongodb+srv://...
JWT_SECRET=some_long_secret
NODE_ENV=development          # IMPORTANT: keep as development
CLIENT_URL=http://localhost:5173   # will be overridden below
```

> `CLIENT_URL` does **not** need updating each ngrok session when `NODE_ENV=development`  
> because the server now auto-accepts all `*.ngrok-free.app` origins.

---

### Step 2 — Start ngrok (first, so you know the URL)

Open a **dedicated terminal** and run:

```powershell
ngrok http 5000
```

You will see output like:

```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
```

Copy that HTTPS URL (e.g. `https://abc123.ngrok-free.app`).

---

### Step 3 — Configure the client for this ngrok URL

Create (or overwrite) `client/.env.local`:

```powershell
# PowerShell — replace the URL with yours
$ngrokUrl = "https://abc123.ngrok-free.app"
"VITE_API_URL=$ngrokUrl`nVITE_SOCKET_URL=$ngrokUrl" | Set-Content client\.env.local
```

> `client/.env.local` is auto-ignored by Vite's default `.gitignore`.  
> Never commit this file.

---

### Step 4 — Build the client

```powershell
cd client
npm install          # only needed first time
npm run build
cd ..
```

The built files land in `client/dist/`. The Express server serves them automatically.

---

### Step 5 — Start the server

```powershell
cd server
npm install          # only needed first time
npm run dev          # uses nodemon for live reload
```

Wait for:

```
🚀 AttendEase Server running on port 5000
📡 Socket.io ready
```

---

### Step 6 — Access the app

Open the ngrok URL in your browser:

```
https://abc123.ngrok-free.app
```

> **ngrok browser warning**: Free plan shows an interstitial page on first browser visit.  
> Click "Visit Site" to proceed. API calls from the frontend pass through without this warning  
> because the `ngrok-skip-browser-warning` header is not required for XHR/fetch requests.  
> If you see it on API calls, add this to `client/src/api.js` interceptor:
>
> ```js
> config.headers['ngrok-skip-browser-warning'] = 'true';
> ```

---

## Summary of commands (quick reference)

```powershell
# Terminal 1 — ngrok tunnel
ngrok http 5000

# Terminal 2 — update client env, build, start server
$url = "https://REPLACE_ME.ngrok-free.app"
"VITE_API_URL=$url`nVITE_SOCKET_URL=$url" | Set-Content client\.env.local
cd client ; npm run build ; cd ..\server ; npm run dev
```

---

## Environment variable reference

### `server/.env`

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Any long random string |
| `NODE_ENV` | Yes | Set to `development` for ngrok |
| `PORT` | No | Defaults to `5000` |
| `CLIENT_URL` | No | Only matters if `NODE_ENV=production` |

### `client/.env.local`

| Variable | Required for ngrok | Notes |
|----------|-------------------|-------|
| `VITE_API_URL` | Yes | ngrok HTTPS URL, no trailing slash |
| `VITE_SOCKET_URL` | Yes | Same as `VITE_API_URL` |

---

## How CORS is handled

The change made to `server/server.js` is minimal and non-breaking:

```js
// ADDED — only applies outside production
const NGROK_PATTERN = /^https?:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app$/;
const NGROK_LEGACY_PATTERN = /^https?:\/\/[a-zA-Z0-9-]+\.ngrok\.io$/;

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.has(normalizeOrigin(origin))) return true;    // ← existing logic untouched

    if (process.env.NODE_ENV !== 'production') {                      // ← new guard
        if (NGROK_PATTERN.test(origin) || NGROK_LEGACY_PATTERN.test(origin)) return true;
    }
    return false;
};
```

- In **production** (`NODE_ENV=production`): unchanged behaviour, only `CLIENT_URL` is trusted.  
- In **development**: any `*.ngrok-free.app` or `*.ngrok.io` origin is accepted without a server restart.

Socket.io uses the exact same `isOriginAllowed` function, so it automatically works through the tunnel.

---

## Socket.io through ngrok

ngrok supports WebSocket upgrades natively. The existing `SocketContext.jsx` already uses:

```js
transports: ['websocket', 'polling']
```

This is ideal — if WebSocket is blocked, Socket.io falls back to long-polling automatically.  
No changes needed.

---

## Troubleshooting

### "CORS origin not allowed" error

1. Verify `NODE_ENV=development` in `server/.env`.
2. Confirm the request `Origin` header matches `https://<id>.ngrok-free.app` exactly (no trailing slash).
3. Restart the server after editing `.env`.

### Frontend calls still hit localhost instead of ngrok

1. Check that `client/.env.local` exists and has the correct URL.
2. Rebuild the client — Vite bakes env vars at build time: `npm run build`.
3. Hard-refresh the browser (Ctrl+Shift+R) to clear cached files.

### Socket connection fails / keeps reconnecting

1. Open Browser DevTools → Network tab → filter by `socket.io`.
2. Check the request URL — it must be the ngrok URL, not `localhost`.
3. Ensure `VITE_SOCKET_URL` in `client/.env.local` is set and client was rebuilt.
4. Confirm the ngrok tunnel is still running (free tunnels expire after ~2 hours of inactivity).

### ngrok tunnel shows 502 Bad Gateway

- The Express server is not running. Start it first (`npm run dev` in `server/`).

### ngrok "ERR_NGROK_3200" — account not verified

- Complete email verification at https://dashboard.ngrok.com.

### API returns HTML (the ngrok warning page) instead of JSON

Add the following to the request interceptor in `client/src/api.js`:

```js
config.headers['ngrok-skip-browser-warning'] = 'true';
```

### New ngrok URL every session (free plan limitation)

The free ngrok plan assigns a new random URL every session. Each new session:

1. Copy the new URL from the ngrok terminal.
2. Update `client/.env.local` with the new URL.
3. Rebuild the client (`npm run build`).
4. The server does **not** need a restart.

> To avoid rebuilding the client each session, upgrade to ngrok's paid plan for a fixed static domain:  
> `ngrok http --domain=your-name.ngrok.app 5000`

---

## Security notes

- Never commit `server/.env` or `client/.env.local`.
- ngrok tunnels are public — treat them like a real public URL during testing.
- The dev CORS relaxation (`NODE_ENV !== 'production'`) is scoped to ngrok domains only.  
  It does **not** open CORS to all origins.
- Shut down ngrok when not actively testing.
