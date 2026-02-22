const express = require('express');
const { validationResult } = require('express-validator');
const Session = require('../models/Session');
const Class = require('../models/Class');
const { auth, authorize } = require('../middleware/auth');
const { sessionValidation } = require('../middleware/validators');
const { generateQRToken } = require('../utils/qrManager');
const { emitQRRefresh, emitSessionUpdate } = require('../utils/socketHandler');

const router = express.Router();

// Store QR refresh intervals per session
const qrIntervals = new Map();

// @route   POST /api/sessions/start
// @desc    Start a new session
// @access  Teacher
router.post('/start', auth, authorize('teacher'), sessionValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { classId, attendanceWindow = 10, latitude, longitude } = req.body;

        // Find class
        const classDoc = await Class.findOne({ classId: classId.toUpperCase() });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        // Check for active session
        const activeSession = await Session.findOne({ class: classDoc._id, isActive: true });
        if (activeSession) {
            return res.status(400).json({ message: 'An active session already exists for this class' });
        }

        // Generate first QR token
        const { token: qrToken, expiresAt: qrExpiresAt } = generateQRToken(classDoc._id.toString());

        const now = new Date();
        const windowMinutes = Math.max(1, Math.min(30, attendanceWindow));

        const session = new Session({
            class: classDoc._id,
            teacher: req.user._id,
            qrToken,
            qrExpiresAt,
            startTime: now,
            attendanceWindowEnd: new Date(now.getTime() + windowMinutes * 60 * 1000),
            location: { latitude, longitude }
        });

        await session.save();

        // Setup QR refresh every 30 seconds (only during attendance window)
        const io = req.app.get('io');
        const intervalId = setInterval(async () => {
            try {
                const currentSession = await Session.findById(session._id);
                if (!currentSession || !currentSession.isActive) {
                    clearInterval(intervalId);
                    qrIntervals.delete(session._id.toString());
                    return;
                }

                // Check if attendance window has closed
                if (new Date() >= currentSession.attendanceWindowEnd) {
                    clearInterval(intervalId);
                    qrIntervals.delete(session._id.toString());

                    if (io) {
                        emitSessionUpdate(io, session._id.toString(), {
                            type: 'ATTENDANCE_WINDOW_CLOSED',
                            sessionId: session._id
                        });
                    }
                    return;
                }

                // Generate new QR token
                const newQR = generateQRToken(classDoc._id.toString());
                currentSession.qrToken = newQR.token;
                currentSession.qrExpiresAt = newQR.expiresAt;
                await currentSession.save();

                if (io) {
                    emitQRRefresh(io, session._id.toString(), {
                        qrToken: newQR.token,
                        expiresAt: newQR.expiresAt
                    });
                }
            } catch (err) {
                console.error('QR refresh error:', err.message);
            }
        }, 30000);

        qrIntervals.set(session._id.toString(), intervalId);

        res.status(201).json({
            session: {
                _id: session._id,
                classId: classDoc.classId,
                subject: classDoc.subject,
                qrToken,
                qrExpiresAt,
                startTime: session.startTime,
                attendanceWindowEnd: session.attendanceWindowEnd,
                location: session.location,
                isActive: true
            }
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/sessions/:id/end
// @desc    End a session
// @access  Teacher
router.post('/:id/end', auth, authorize('teacher'), async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        session.isActive = false;
        session.endTime = new Date();
        await session.save();

        // Clear QR interval
        const intervalId = qrIntervals.get(session._id.toString());
        if (intervalId) {
            clearInterval(intervalId);
            qrIntervals.delete(session._id.toString());
        }

        const io = req.app.get('io');
        if (io) {
            emitSessionUpdate(io, session._id.toString(), {
                type: 'SESSION_ENDED',
                sessionId: session._id
            });
        }

        res.json({ message: 'Session ended', session });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/sessions/active/:classId
// @desc    Get active session for class
// @access  Private
router.get('/active/:classId', auth, async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const session = await Session.findOne({ class: classDoc._id, isActive: true })
            .populate('teacher', 'name');

        if (!session) {
            return res.status(404).json({ message: 'No active session' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/sessions/history/:classId
// @desc    Get session history for class
// @access  Teacher
router.get('/history/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const sessions = await Session.find({ class: classDoc._id })
            .sort({ startTime: -1 })
            .limit(50);

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('class', 'classId subject')
            .populate('teacher', 'name');

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
