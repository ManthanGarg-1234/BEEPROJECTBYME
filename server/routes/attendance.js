const express = require('express');
const { validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const SuspiciousLog = require('../models/SuspiciousLog');
const { auth, authorize } = require('../middleware/auth');
const { attendanceValidation } = require('../middleware/validators');
const { isWithinRadius } = require('../utils/gpsValidator');
const { emitAttendanceUpdate } = require('../utils/socketHandler');

const router = express.Router();

// @route   POST /api/attendance/mark
// @desc    Mark attendance (student scans QR)
// @access  Student
router.post('/mark', auth, authorize('student'), attendanceValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { qrToken, latitude, longitude, deviceId, accuracy } = req.body;
        const studentId = req.user._id;

        console.log(`[ATTENDANCE DEBUG] Student: ${req.user.name} (${studentId}), Device: ${deviceId}, Location: ${latitude}, ${longitude}`);

        // 1. Find active session by QR token
        const session = await Session.findOne({ qrToken, isActive: true });

        if (!session) {
            // Check if token exists but is expired
            const expiredSession = await Session.findOne({ qrToken });
            if (expiredSession) {
                console.log(`[ATTENDANCE DEBUG] REJECTED: Expired QR for ${req.user.name}`);
                await logSuspicious(studentId, expiredSession._id, 'EXPIRED_QR', deviceId, { latitude, longitude });
                return res.status(400).json({ message: 'QR code has expired. Wait for refresh.' });
            }

            console.log(`[ATTENDANCE DEBUG] REJECTED: Invalid QR for ${req.user.name}`);
            await logSuspicious(studentId, null, 'INVALID_QR', deviceId, { latitude, longitude });
            return res.status(400).json({ message: 'Invalid QR code' });
        }

        // 2. Check QR expiry
        if (new Date() > new Date(session.qrExpiresAt)) {
            console.log(`[ATTENDANCE DEBUG] REJECTED: QR expired (time) for ${req.user.name}`);
            await logSuspicious(studentId, session._id, 'EXPIRED_QR', deviceId, { latitude, longitude });
            return res.status(400).json({ message: 'QR code has expired. Wait for refresh.' });
        }

        // 3. Check if attendance window has closed
        if (new Date() > new Date(session.attendanceWindowEnd)) {
            console.log(`[ATTENDANCE DEBUG] REJECTED: Window closed for ${req.user.name}`);
            await logSuspicious(studentId, session._id, 'WINDOW_CLOSED', deviceId, { latitude, longitude });
            return res.status(400).json({ message: 'Attendance window has closed' });
        }

        // 4. Check duplicate attendance
        const existingAttendance = await Attendance.findOne({
            session: session._id,
            student: studentId
        });
        if (existingAttendance) {
            console.log(`[ATTENDANCE DEBUG] REJECTED: Duplicate attendance for ${req.user.name}`);
            await logSuspicious(studentId, session._id, 'DUPLICATE_ATTENDANCE', deviceId, { latitude, longitude });
            return res.status(400).json({ message: 'Attendance already marked for this session' });
        }

        // 5. Check device ID (one device per session)
        const deviceUsed = await Attendance.findOne({
            session: session._id,
            deviceId
        });
        if (deviceUsed) {
            console.log(`[ATTENDANCE DEBUG] REJECTED: Duplicate device for ${req.user.name}, device: ${deviceId}`);
            await logSuspicious(studentId, session._id, 'DUPLICATE_DEVICE', deviceId, { latitude, longitude });
            return res.status(400).json({ message: 'This device has already been used to mark attendance in this session' });
        }

        // 6. GPS validation (optional)
        let gpsResult = { isValid: true, distance: 0 };
        const enforceGps = String(process.env.GPS_ENFORCE || 'true').toLowerCase() !== 'false';

        if (enforceGps) {
            const radiusMeters = parseInt(process.env.GPS_RADIUS_METERS) || 100;
            const accuracyMeters = Number.isFinite(Number(accuracy)) ? Number(accuracy) : 0;
            const teacherAccuracy = Number.isFinite(Number(session.location?.accuracy)) ? Number(session.location.accuracy) : 0;
            const effectiveRadius = radiusMeters + accuracyMeters + teacherAccuracy;
            gpsResult = isWithinRadius(
                session.location.latitude,
                session.location.longitude,
                latitude,
                longitude,
                effectiveRadius
            );

            console.log(`[ATTENDANCE DEBUG] GPS check for ${req.user.name}: distance=${gpsResult.distance}m, limit=${effectiveRadius}m (base ${radiusMeters}m, student acc ${accuracyMeters}m, teacher acc ${teacherAccuracy}m), valid=${gpsResult.isValid}`);
            console.log(`[ATTENDANCE DEBUG] Session location: ${session.location.latitude}, ${session.location.longitude} | Student location: ${latitude}, ${longitude}`);

            if (!gpsResult.isValid) {
                await logSuspicious(studentId, session._id, 'GPS_OUT_OF_RANGE', deviceId, { latitude, longitude },
                    `Distance: ${gpsResult.distance}m, Limit: ${radiusMeters}m`);
                return res.status(400).json({
                    message: `You are too far from the classroom (${gpsResult.distance}m away, limit: ${effectiveRadius}m)`
                });
            }
        } else {
            console.log(`[ATTENDANCE DEBUG] GPS check skipped for ${req.user.name} (GPS_ENFORCE=false)`);
        }

        // 7. Determine status based on time
        const minutesSinceStart = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60);
        let status;
        let suspiciousFlag = false;

        if (minutesSinceStart <= 5) {
            status = 'Present';
        } else if (minutesSinceStart <= 15) {
            status = 'Late';
        } else {
            // Beyond 15 minutes - reject
            await logSuspicious(studentId, session._id, 'LATE_REJECTED', deviceId, { latitude, longitude },
                `${Math.round(minutesSinceStart)} minutes late`);
            return res.status(400).json({
                message: 'Too late to mark attendance (>15 minutes). Attendance rejected.'
            });
        }

        // Check for suspicious patterns
        if (enforceGps && gpsResult.distance > (parseInt(process.env.GPS_RADIUS_METERS) || 100) * 0.8) {
            suspiciousFlag = true;
        }

        // 8. Create attendance record
        const attendance = new Attendance({
            session: session._id,
            student: studentId,
            class: session.class,
            status,
            deviceId,
            distance: gpsResult.distance,
            location: { latitude, longitude },
            suspiciousFlag
        });

        await attendance.save();

        // Update session attendance count
        session.attendanceCount += 1;
        await session.save();

        // Emit live update
        const io = req.app.get('io');
        if (io) {
            emitAttendanceUpdate(io, session._id.toString(), {
                student: {
                    _id: req.user._id,
                    name: req.user.name,
                    rollNumber: req.user.rollNumber
                },
                status,
                distance: gpsResult.distance,
                markedAt: attendance.markedAt,
                suspiciousFlag
            });
        }

        res.status(201).json({
            message: `Attendance marked as ${status}`,
            attendance: {
                status,
                distance: gpsResult.distance,
                markedAt: attendance.markedAt
            }
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/attendance/session/:sessionId
// @desc    Get attendance for a session
// @access  Teacher
router.get('/session/:sessionId', auth, authorize('teacher'), async (req, res) => {
    try {
        const attendance = await Attendance.find({ session: req.params.sessionId })
            .populate('student', 'name email rollNumber')
            .sort({ markedAt: 1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/attendance/student/:classId
// @desc    Get student's own attendance for a class
// @access  Student
router.get('/student/:classId', auth, authorize('student'), async (req, res) => {
    try {
        const attendance = await Attendance.find({
            class: req.params.classId,
            student: req.user._id
        })
            .populate('session', 'startTime endTime')
            .sort({ markedAt: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/attendance/suspicious/:sessionId
// @desc    Get suspicious logs for a session
// @access  Teacher
router.get('/suspicious/:sessionId', auth, authorize('teacher'), async (req, res) => {
    try {
        const logs = await SuspiciousLog.find({ session: req.params.sessionId })
            .populate('student', 'name email rollNumber')
            .sort({ createdAt: -1 });

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/attendance/manual/:sessionId
// @desc    Get all enrolled students with attendance status for manual marking
// @access  Teacher
router.get('/manual/:sessionId', auth, authorize('teacher'), async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId).populate('class');
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const Class = require('../models/Class');
        const cls = await Class.findById(session.class._id || session.class).populate('students', 'name email rollNumber');
        if (!cls) return res.status(404).json({ message: 'Class not found' });

        const attendance = await Attendance.find({ session: session._id }).populate('student', 'name email rollNumber');
        const attendanceMap = {};
        attendance.forEach(a => { attendanceMap[a.student._id.toString()] = a; });

        const studentList = cls.students.map(s => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            rollNumber: s.rollNumber,
            status: attendanceMap[s._id.toString()]?.status || 'Absent',
            attendanceId: attendanceMap[s._id.toString()]?._id || null,
            markedAt: attendanceMap[s._id.toString()]?.markedAt || null,
            isManual: attendanceMap[s._id.toString()]?.isManual || false
        }));

        studentList.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

        res.json({
            session: { _id: session._id, classId: cls.classId, subject: cls.subject, startTime: session.startTime, isActive: session.isActive },
            students: studentList
        });
    } catch (error) {
        console.error('Manual attendance fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/attendance/manual
// @desc    Manually mark/update attendance for a student
// @access  Teacher
router.post('/manual', auth, authorize('teacher'), async (req, res) => {
    try {
        const { sessionId, studentId, status } = req.body;

        if (!sessionId || !studentId || !['Present', 'Late', 'Absent'].includes(status)) {
            return res.status(400).json({ message: 'sessionId, studentId, and valid status (Present/Late/Absent) are required' });
        }

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Check existing attendance
        let attendance = await Attendance.findOne({ session: sessionId, student: studentId });

        if (attendance) {
            // Update existing record
            const oldStatus = attendance.status;
            attendance.status = status;
            attendance.isManual = true;
            await attendance.save();

            // Adjust attendance count
            if (oldStatus === 'Absent' && status !== 'Absent') {
                session.attendanceCount += 1;
                await session.save();
            } else if (oldStatus !== 'Absent' && status === 'Absent') {
                session.attendanceCount = Math.max(0, session.attendanceCount - 1);
                await session.save();
            }
        } else if (status !== 'Absent') {
            // Create new record (only if not marking absent, since absent = no record)
            attendance = await Attendance.create({
                session: sessionId,
                student: studentId,
                class: session.class,
                status,
                isManual: true,
                deviceId: 'MANUAL',
                distance: 0,
                location: session.location
            });
            session.attendanceCount += 1;
            await session.save();
        }

        // Populate student for response
        const User = require('../models/User');
        const student = await User.findById(studentId).select('name rollNumber');

        // Emit live update
        const io = req.app.get('io');
        if (io) {
            emitAttendanceUpdate(io, sessionId, {
                student: { _id: studentId, name: student?.name, rollNumber: student?.rollNumber },
                status,
                distance: 0,
                markedAt: attendance?.markedAt || new Date(),
                isManual: true
            });
        }

        res.json({ message: `Attendance ${status === 'Absent' ? 'removed' : 'marked as ' + status} (manual)`, status });
    } catch (error) {
        console.error('Manual attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper: log suspicious activity
async function logSuspicious(studentId, sessionId, reason, deviceId, location, details = '') {
    try {
        await SuspiciousLog.create({
            student: studentId,
            session: sessionId,
            reason,
            deviceId,
            location,
            details
        });
    } catch (err) {
        console.error('Suspicious log error:', err.message);
    }
}

module.exports = router;
