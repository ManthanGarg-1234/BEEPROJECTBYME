const jwt = require('jsonwebtoken');

/**
 * Socket.io event handler
 */
const initSocketHandler = (io) => {
    // Auth middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`);

        // Teacher joins their session room
        socket.on('join-session', (sessionId) => {
            socket.join(`session:${sessionId}`);
            console.log(`[Socket] User ${socket.userId} joined session:${sessionId}`);
        });

        // Teacher joins class room
        socket.on('join-class', (classId) => {
            socket.join(`class:${classId}`);
            console.log(`[Socket] User ${socket.userId} joined class:${classId}`);
        });

        // Leave rooms
        socket.on('leave-session', (sessionId) => {
            socket.leave(`session:${sessionId}`);
        });

        socket.on('leave-class', (classId) => {
            socket.leave(`class:${classId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.userId}`);
        });
    });

    return io;
};

/**
 * Emit attendance update to session room
 */
const emitAttendanceUpdate = (io, sessionId, data) => {
    io.to(`session:${sessionId}`).emit('attendance-update', data);
};

/**
 * Emit QR refresh to session room
 */
const emitQRRefresh = (io, sessionId, data) => {
    io.to(`session:${sessionId}`).emit('qr-refresh', data);
};

/**
 * Emit session status change
 */
const emitSessionUpdate = (io, sessionId, data) => {
    io.to(`session:${sessionId}`).emit('session-update', data);
};

module.exports = { initSocketHandler, emitAttendanceUpdate, emitQRRefresh, emitSessionUpdate };
