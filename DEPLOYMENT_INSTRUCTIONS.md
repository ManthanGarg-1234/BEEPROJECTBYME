# Temporary Deployment Guide (ngrok) – AttendEase MERN Project

## Project Context

You are working on a MERN stack project with the following setup:

- Express backend
- Socket.io integration
- React frontend built with Vite
- Backend serves frontend static files from client/dist
- MongoDB Atlas database
- Environment variables handled using dotenv
- CLIENT_URL used for CORS origin validation
- Cron jobs enabled
- Single server deployment structure (backend + frontend together)

This project is NOT meant for permanent deployment.
It requires temporary public access for demo/testing purposes using ngrok.

---

## Deployment Goal

Configure the project so that:

1. It works with ngrok temporary public URL.
2. It does NOT break existing CORS logic.
3. It works properly with Socket.io.
4. CLIENT_URL can support dynamic ngrok URLs.
5. No major refactoring is done.
6. Existing production logic remains untouched.
7. Safe development configuration is maintained.

---

## Required Tasks

### 1. Improve CORS Handling for Development

Modify CORS logic so that:

- In production:
  - Only CLIENT_URL is allowed.
- In development:
  - Allow localhost
  - Allow ngrok URLs dynamically
  - Do not allow completely unrestricted origins

Do NOT remove existing normalizeOrigin logic.
Enhance it safely.

---

### 2. Ensure Socket.io Works with ngrok

- Socket.io must use same CORS rules as Express.
- Ensure credentials: true is preserved.
- Make sure no hardcoded localhost URLs exist in frontend socket connection.

Frontend socket connection must use:

    const socket = io(window.location.origin);

Do not use hardcoded localhost URLs.

---

### 3. CLIENT_URL Handling

Improve environment handling:

- If CLIENT_URL is defined → use it.
- If not defined in development → fallback to localhost.
- Support dynamic ngrok origin safely.

Do NOT hardcode ngrok URL inside server code.

---

### 4. Terminal Commands Required

Provide exact commands for:

1. Install dependencies
2. Build frontend
3. Start backend server
4. Start ngrok tunnel
5. How to update CLIENT_URL after ngrok starts

Example flow expected:

    npm install
    npm run build
    npm start
    ngrok http 5000

---

### 5. Troubleshooting Section

Include:

- CORS errors
- Socket connection failure
- 502 bad gateway
- Mixed content (http vs https)
- MongoDB connection errors

---

### 6. Safety Constraints

DO NOT:

- Refactor entire project
- Remove cron jobs
- Remove socket logic
- Replace CORS system completely
- Convert to permanent deployment setup
- Introduce new frameworks

Only minimal safe improvements allowed.

---

## Expected Output

Provide:

- Clear explanation of changes
- Updated server.js snippet if necessary
- Updated frontend socket snippet
- Clean terminal workflow
- Short troubleshooting checklist
