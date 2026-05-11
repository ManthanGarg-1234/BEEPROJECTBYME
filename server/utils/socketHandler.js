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

        // User joins notification room
        socket.on('join-notifications', () => {
            socket.join(`user:${socket.userId}`);
            console.log(`[Socket] User ${socket.userId} joined notification room`);
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

/**
 * Emit proxy/duplicate-device alert to teacher's session room
 */
const emitProxyAlert = (io, sessionId, data) => {
    io.to(`session:${sessionId}`).emit('proxy-alert', data);
};

/**
 * Send notification to specific user
 */
const emitNotification = (io, userId, notification) => {
    io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Broadcast announcement to class
 */
const emitClassAnnouncement = (io, classId, announcement) => {
    io.to(`class:${classId}`).emit('class-announcement', announcement);
};

/**
 * Notify teacher of leave request
 */
const emitLeaveRequest = (io, teacherId, data) => {
    io.to(`user:${teacherId}`).emit('leave-request-notification', data);
};

/**
 * Notify student of leave status change
 */
const emitLeaveStatusChange = (io, studentId, data) => {
    io.to(`user:${studentId}`).emit('leave-status-change', data);
};

/**
 * Notify of low attendance alert
 */
const emitAttendanceAlert = (io, studentId, message) => {
    io.to(`user:${studentId}`).emit('attendance-alert', message);
};

module.exports = { initSocketHandler, emitAttendanceUpdate, emitQRRefresh, emitSessionUpdate, emitProxyAlert, emitNotification, emitClassAnnouncement, emitLeaveRequest, emitLeaveStatusChange, emitAttendanceAlert };
