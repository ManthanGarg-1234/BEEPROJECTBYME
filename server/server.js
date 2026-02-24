require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/db');
const { initSocketHandler } = require('./utils/socketHandler');
const { initCronJobs } = require('./utils/cronJobs');

const app = express();
const server = http.createServer(app);

const normalizeOrigin = (origin) => (origin || '').replace(/\/+$/, '');

// In production: trust only CLIENT_URL (plus same-origin with no Origin header).
// In development: fall back to localhost:5173 when CLIENT_URL is not set.
const DEFAULT_DEV_CLIENT = 'http://localhost:5173';
const clientOrigin = process.env.CLIENT_URL ? normalizeOrigin(process.env.CLIENT_URL) : null;

const allowedOrigins = new Set(
    [
        clientOrigin,
        // Allow Vite dev server only outside production
        ...(process.env.NODE_ENV !== 'production' ? [DEFAULT_DEV_CLIENT] : [])
    ]
        .filter(Boolean)
        .map(normalizeOrigin)
);

// VS Code Dev Tunnel pattern
const DEVTUNNEL_PATTERN = /^https?:\/\/.*\.devtunnels\.ms$/;
// Ngrok tunnel pattern
const NGROK_PATTERN = /^https?:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app$/;

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.has(normalizeOrigin(origin))) return true;
    // Allow Tunnels in development
    if (process.env.NODE_ENV !== 'production') {
        if (DEVTUNNEL_PATTERN.test(origin) || NGROK_PATTERN.test(origin)) return true;
    }
    return false;
};

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) {
                callback(null, origin);
                return;
            }
            callback(new Error('CORS origin not allowed'));
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in routes
app.set('io', io);

// Initialize socket handler
initSocketHandler(io);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, origin);
            return;
        }
        callback(new Error('CORS origin not allowed'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/class'));
app.use('/api/sessions', require('./routes/session'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve uploaded files (profile photos etc.)
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Serve static frontend files in production mode
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`\n🚀 AttendEase Server running on port ${PORT}`);
        console.log(`📡 Socket.io ready`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });

    // Initialize cron jobs
    initCronJobs();
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = { app, server, io };
