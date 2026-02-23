const { v4: uuidv4 } = require('uuid');

// Generate a new QR token with expiry
const generateQRToken = (sessionId) => {
    return {
        token: `${sessionId}_${uuidv4()}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 60 * 1000) // 60 seconds
    };
};

// Validate QR token
const isQRValid = (session) => {
    if (!session || !session.isActive) return false;
    if (new Date() > new Date(session.qrExpiresAt)) return false;
    return true;
};

// Check if QR token matches session
const matchesSession = (session, qrToken) => {
    return session.qrToken === qrToken;
};

module.exports = { generateQRToken, isQRValid, matchesSession };
