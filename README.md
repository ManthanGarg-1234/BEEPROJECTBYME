# AttendEase - Smart QR Based Attendance System

A production-ready MERN stack application for smart QR-based attendance management with GPS validation, real-time updates, and comprehensive analytics.

## 🏗 Project Structure

```
project/
├── server/                    # Backend (Node.js + Express + MongoDB)
│   ├── config/db.js           # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js            # JWT + role-based auth middleware
│   │   └── validators.js      # express-validator rules
│   ├── models/
│   │   ├── User.js            # User (teacher/student) model
│   │   ├── Class.js           # Class with semester dates
│   │   ├── Session.js         # Attendance session + QR token
│   │   ├── Attendance.js      # Attendance records
│   │   └── SuspiciousLog.js   # Proxy attempt logging
│   ├── routes/
│   │   ├── auth.js            # Register, Login, Change Password
│   │   ├── class.js           # CRUD classes, Bulk Enroll
│   │   ├── session.js         # Start/End sessions, QR refresh
│   │   ├── attendance.js      # Mark attendance (GPS+QR+Device)
│   │   └── analytics.js       # Dashboard, Charts, CSV, Evaluation
│   ├── utils/
│   │   ├── qrManager.js       # QR token generation/validation
│   │   ├── gpsValidator.js    # Haversine GPS distance calc
│   │   ├── passwordGenerator.js
│   │   ├── emailService.js    # Nodemailer warning/welcome emails
│   │   ├── evaluationEngine.js # Attendance eval + warnings
│   │   ├── cronJobs.js        # Weekly eval + session cleanup
│   │   └── socketHandler.js   # Socket.io events
│   ├── server.js              # Main entry point
│   ├── .env                   # Environment variables
│   └── package.json
│
└── client/                    # Frontend (React + Vite + Tailwind)
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   ├── ThemeContext.jsx
    │   │   └── SocketContext.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── ChangePassword.jsx
    │   │   ├── teacher/
    │   │   │   ├── TeacherDashboard.jsx
    │   │   │   ├── ClassManagement.jsx
    │   │   │   ├── BulkEnroll.jsx
    │   │   │   ├── SessionManager.jsx
    │   │   │   ├── LiveAttendance.jsx
    │   │   │   ├── AttendanceReport.jsx
    │   │   │   └── EvaluationPanel.jsx
    │   │   └── student/
    │   │       ├── StudentDashboard.jsx
    │   │       └── ScanQR.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── api.js
    │   └── index.css
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd server
cp .env.example .env    # Edit .env with your MongoDB URI
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The backend runs on `http://localhost:5000` and frontend on `http://localhost:5173`.

## ☁ Deployment

### MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user and whitelist `0.0.0.0/0`
3. Copy connection string to `MONGO_URI` in server `.env`

### Backend → Render
1. Create a new Web Service on [render.com](https://render.com)
2. Connect your Git repo, set root directory to `server`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all environment variables from `.env.example`

### Frontend → Vercel
1. Import project on [vercel.com](https://vercel.com)
2. Set root directory to `client`
3. Framework preset: Vite
4. Environment variable: `VITE_API_URL=https://your-backend.onrender.com`
5. Environment variable: `VITE_SOCKET_URL=https://your-backend.onrender.com`

## 🔑 Key Features

| Feature | Implementation |
|---------|---------------|
| Dynamic QR | UUID tokens, 30s refresh via Socket.io |
| GPS Validation | Haversine formula, configurable radius |
| Device Restriction | One deviceId per session |
| Proxy Prevention | 6-step validation pipeline |
| Late Logic | 0-5m: Present, 5-15m: Late, >15m: Reject |
| Evaluation Engine | 40% semester gate, Warning/Critical levels |
| Email Warnings | 10-day cooldown, styled HTML emails |
| Cron Jobs | Weekly evaluation + session auto-cleanup |
| Real-time | Socket.io live attendance + QR refresh |
| CSV Export | Full attendance data with percentages |
| Heatmap | Visual attendance grid (student × session) |
| Dark Mode | System-aware toggle with localStorage |

## ✅ Testing Checklist

- [ ] Register as teacher (valid college email format)
- [ ] Login and verify JWT token
- [ ] Create a class with semester dates
- [ ] Bulk enroll students (3 formats: dash, comma, space)
- [ ] Verify student accounts created with temp passwords
- [ ] Student login with temp password
- [ ] Student changes password (firstLogin flow)
- [ ] Teacher starts session (GPS acquired)
- [ ] QR refreshes every 30s (check socket events)
- [ ] Student scans QR (within GPS radius)
- [ ] Verify Present/Late status based on timing
- [ ] Verify device restriction (same device blocked)
- [ ] Verify GPS out-of-range rejection
- [ ] Check suspicious logs for rejections
- [ ] Verify live attendance updates (teacher view)
- [ ] End session and verify it stops
- [ ] Check teacher dashboard (all stats)
- [ ] Check daily chart (Recharts)
- [ ] Check attendance heatmap
- [ ] Export CSV and verify contents
- [ ] Run evaluation (semester > 40%)
- [ ] Verify warning email sent (if SMTP configured)
- [ ] Check student dashboard (percentage, warning, timeline)
- [ ] Toggle dark/light mode
- [ ] Test mobile responsiveness
- [ ] Verify session auto-terminates at endTime
```
