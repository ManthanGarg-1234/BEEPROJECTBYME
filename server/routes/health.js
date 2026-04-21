const express = require('express');
const router = express.Router();

// FALLBACK HEALTH CHECK - Works without database
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        message: 'Server is running'
    });
});

// FALLBACK API STATUS
router.get('/status', (req, res) => {
    const isConnected = require('mongoose').connection.readyState === 1;
    res.status(200).json({
        api: 'healthy',
        database: isConnected ? 'connected' : 'disconnected',
        frontend: 'ready',
        version: '1.0.0'
    });
});

module.exports = router;
