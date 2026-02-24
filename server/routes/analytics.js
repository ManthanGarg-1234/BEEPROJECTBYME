const express = require('express');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { calculateAttendancePercentage, getWarningLevel, evaluateClassAttendance } = require('../utils/evaluationEngine');

const router = express.Router();

// @route   GET /api/analytics/dashboard/:classId
// @desc    Get teacher dashboard stats
// @access  Teacher
router.get('/dashboard/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() })
            .populate('students', 'name email rollNumber');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Total sessions
        const sessions = await Session.find({ class: classDoc._id });
        const totalSessions = sessions.length;

        // Calculate per-student stats
        const studentStats = [];
        let totalPercentage = 0;
        let belowThreshold = 0;

        for (const student of classDoc.students) {
            const { percentage, presentCount } = await calculateAttendancePercentage(student._id, classDoc._id);
            const warningLevel = getWarningLevel(percentage);
            if (percentage < 75) belowThreshold++;
            totalPercentage += percentage;

            studentStats.push({
                _id: student._id,
                name: student.name,
                rollNumber: student.rollNumber,
                email: student.email,
                percentage,
                presentCount,
                totalSessions,
                warningLevel
            });
        }

        const avgAttendance = classDoc.students.length > 0
            ? Math.round((totalPercentage / classDoc.students.length) * 100) / 100
            : 0;

        res.json({
            classId: classDoc.classId,
            subject: classDoc.subject,
            semesterProgress: classDoc.semesterProgress,
            totalSessions,
            totalStudents: classDoc.students.length,
            avgAttendance,
            belowThresholdCount: belowThreshold,
            studentStats
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/daily-chart/:classId
// @desc    Get daily attendance percentages for chart
// @access  Teacher
router.get('/daily-chart/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 });
        const totalStudents = classDoc.students.length;
        const dailyData = [];

        for (const session of sessions) {
            const presentCount = await Attendance.countDocuments({
                session: session._id,
                status: 'Present'
            });
            const lateCount = await Attendance.countDocuments({
                session: session._id,
                status: 'Late'
            });

            const percentage = totalStudents > 0
                ? Math.round((presentCount / totalStudents) * 10000) / 100
                : 0;

            dailyData.push({
                date: session.startTime.toISOString().split('T')[0],
                sessionId: session._id,
                present: presentCount,
                late: lateCount,
                absent: totalStudents - presentCount - lateCount,
                total: totalStudents,
                percentage
            });
        }

        res.json(dailyData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/heatmap/:classId
// @desc    Get attendance heatmap data
// @access  Teacher
router.get('/heatmap/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() })
            .populate('students', 'name rollNumber');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 });
        const heatmapData = [];

        for (const student of classDoc.students) {
            const row = {
                name: student.name,
                rollNumber: student.rollNumber,
                sessions: []
            };

            for (const session of sessions) {
                const att = await Attendance.findOne({
                    session: session._id,
                    student: student._id
                });

                row.sessions.push({
                    date: session.startTime.toISOString().split('T')[0],
                    status: att ? att.status : 'Absent'
                });
            }

            heatmapData.push(row);
        }

        res.json({
            dates: sessions.map(s => s.startTime.toISOString().split('T')[0]),
            students: heatmapData
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/csv/:classId
// @desc    Export attendance as CSV
// @access  Teacher
router.get('/csv/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const { type } = req.query; // 'daily' or 'monthly'
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() })
            .populate('students', 'name rollNumber email');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 });
        const rows = [];

        for (const student of classDoc.students) {
            const row = {
                'Roll Number': student.rollNumber,
                'Name': student.name,
                'Email': student.email
            };

            let presentCount = 0;
            for (const session of sessions) {
                const att = await Attendance.findOne({
                    session: session._id,
                    student: student._id
                });

                const dateKey = session.startTime.toISOString().split('T')[0];
                row[dateKey] = att ? att.status : 'Absent';
                if (att && att.status === 'Present') presentCount++;
            }

            row['Total Present'] = presentCount;
            row['Total Sessions'] = sessions.length;
            row['Percentage'] = sessions.length > 0
                ? `${((presentCount / sessions.length) * 100).toFixed(1)}%`
                : '0%';

            rows.push(row);
        }

        // Build CSV
        if (rows.length === 0) {
            return res.status(200).send('No data available');
        }

        const headers = Object.keys(rows[0]);
        let csv = headers.join(',') + '\n';
        for (const row of rows) {
            csv += headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${classDoc.classId}_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/analytics/evaluate/:classId
// @desc    Manually trigger attendance evaluation
// @access  Teacher
router.post('/evaluate/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const result = await evaluateClassAttendance(classDoc._id);
        res.json(result);
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/student-dashboard
// @desc    Get student's own dashboard data
// @access  Student
router.get('/student-dashboard', auth, authorize('student'), async (req, res) => {
    try {
        // Get all classes the student is enrolled in
        const classes = await Class.find({ students: req.user._id })
            .populate('teacher', 'name');

        const classData = [];

        for (const cls of classes) {
            const { percentage, totalSessions, presentCount } = await calculateAttendancePercentage(req.user._id, cls._id);
            const warningLevel = getWarningLevel(percentage);

            // Get session-wise attendance
            const sessions = await Session.find({ class: cls._id }).sort({ startTime: 1 });
            const attendanceTimeline = [];

            for (const session of sessions) {
                const att = await Attendance.findOne({
                    session: session._id,
                    student: req.user._id
                });

                attendanceTimeline.push({
                    date: session.startTime.toISOString().split('T')[0],
                    status: att ? att.status : 'Absent'
                });
            }

            classData.push({
                classId: cls.classId,
                subject: cls.subject,
                teacher: cls.teacher.name,
                percentage,
                presentCount,
                totalSessions,
                warningLevel,
                semesterProgress: cls.semesterProgress,
                attendanceTimeline
            });
        }

        res.json({
            student: {
                name: req.user.name,
                email: req.user.email,
                rollNumber: req.user.rollNumber
            },
            classes: classData
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/class-daily/:classId
// @desc    Get daily group attendance stats for a class (student-accessible)
// @access  Student (must be enrolled)
router.get('/class-daily/:classId', auth, authorize('student'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        // verify student is enrolled
        const enrolled = classDoc.students.some(s => s.toString() === req.user._id.toString());
        if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this class' });

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 });
        const totalStudents = classDoc.students.length;

        const daily = await Promise.all(sessions.map(async (session) => {
            const present = await Attendance.countDocuments({ session: session._id, status: 'Present' });
            const late = await Attendance.countDocuments({ session: session._id, status: 'Late' });
            const absent = totalStudents - present - late;
            const pct = totalStudents > 0 ? Math.round((present / totalStudents) * 1000) / 10 : 0;
            return {
                date: session.startTime.toISOString().split('T')[0],
                present,
                late,
                absent,
                total: totalStudents,
                percentage: pct,
            };
        }));

        res.json({ totalStudents, daily });
    } catch (err) {
        console.error('class-daily error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
