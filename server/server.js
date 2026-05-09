require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/db');
const { initSocketHandler } = require('./utils/socketHandler');
const { initCronJobs } = require('./utils/cronJobs');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    'https://beeprojectbyme.vercel.app',
    'http://localhost:5173',
    'http://localhost:5000'
];

const checkOrigin = function (origin, callback) {
    // In production, you might want to be strict, but for fixing deployment issues,
    // we allow the domain or localhost
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
    } else {
        callback(null, true); // Allow all for now to unbreak deployed links
    }
};

app.use(cors({
    origin: checkOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: true, // Allow all origins for socket.io temporarily to fix connection issues
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in routes
app.set('io', io);

// Initialize socket handler
initSocketHandler(io);

// Middleware
app.use(compression()); // gzip — reduces response size by ~60-80%
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/class'));
app.use('/api/sessions', require('./routes/session'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/email', require('./routes/email'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SMTP debug (temporary — remove after debugging)
app.get('/api/smtp-test', async (req, res) => {
    const nodemailer = require('nodemailer');
    const info = {
        SMTP_USER: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 6) + '***' : 'NOT SET',
        SMTP_PASS: process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'NOT SET',
        SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
        SMTP_PORT: process.env.SMTP_PORT || 'NOT SET'
    };
    try {
        const t = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await t.verify();
        res.json({ ...info, status: 'OK', message: 'SMTP connection successful' });
    } catch (err) {
        res.json({ ...info, status: 'FAILED', error: err.message });
    }
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
