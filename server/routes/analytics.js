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

// @route   GET /api/analytics/group-overview
// @desc    Summary matrix: all groups × all subjects (aggregation-powered, fast)
// @access  Teacher
router.get('/group-overview', auth, authorize('teacher'), async (req, res) => {
    try {
        const GROUPS = ['G18', 'G19', 'G20', 'G21', 'G22'];
        const SUBJECTS = [
            { code: 'CN',     name: 'Computer Networks' },
            { code: 'BE',     name: 'Backend Engineering' },
            { code: 'DSOOPS', name: 'DSOOPS' },
            { code: 'LINUX',  name: 'Linux Administration' },
            { code: 'DM',     name: 'Discrete Mathematics' },
        ];

        // Fetch all 25 classes at once
        const allClasses = await Class.find({
            classId: { $in: SUBJECTS.flatMap(s => GROUPS.map(g => `${s.code}-${g}`)) }
        }).lean();

        const classMap = {};
        allClasses.forEach(c => { classMap[c.classId] = c; });

        // One aggregation: count by class + status
        const classIds = allClasses.map(c => c._id);
        const sessionDocs = await Session.find({ class: { $in: classIds } }).lean();
        const sessionMap = {}; // classId_str → [sessionIds]
        sessionDocs.forEach(s => {
            const k = s.class.toString();
            if (!sessionMap[k]) sessionMap[k] = [];
            sessionMap[k].push(s._id);
        });

        const attAgg = await Attendance.aggregate([
            { $match: { class: { $in: classIds } } },
            { $group: { _id: { class: '$class', status: '$status' }, count: { $sum: 1 } } }
        ]);

        // Map: classObjectId → { Present, Late, Absent }
        const attMap = {};
        attAgg.forEach(({ _id, count }) => {
            const k = _id.class.toString();
            if (!attMap[k]) attMap[k] = { Present: 0, Late: 0, Absent: 0 };
            attMap[k][_id.status] = count;
        });

        const matrix = {};
        for (const sub of SUBJECTS) {
            matrix[sub.code] = {};
            for (const group of GROUPS) {
                const cid = `${sub.code}-${group}`;
                const cls = classMap[cid];
                if (!cls) { matrix[sub.code][group] = null; continue; }
                const k = cls._id.toString();
                const totalSessions = (sessionMap[k] || []).length;
                const totalStudents = cls.students.length;
                const present = attMap[k]?.Present || 0;
                const late    = attMap[k]?.Late    || 0;
                const totalSlots = totalStudents * totalSessions;
                const absent  = totalSlots - present - late;
                const pct     = totalSlots > 0 ? Math.round(((present + late) / totalSlots) * 1000) / 10 : 0;
                matrix[sub.code][group] = { present, late, absent, total: totalSlots, totalSessions, totalStudents, pct };
            }
        }

        res.json({ subjects: SUBJECTS, groups: GROUPS, matrix });
    } catch (err) {
        console.error('group-overview error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/group-subject-daily/:subjectCode
// @desc    Per-group daily attendance stats (aggregation-powered)
// @access  Teacher
router.get('/group-subject-daily/:subjectCode', auth, authorize('teacher'), async (req, res) => {
    try {
        const GROUPS = ['G18', 'G19', 'G20', 'G21', 'G22'];
        const subjectCode = req.params.subjectCode.toUpperCase();

        const classIds = GROUPS.map(g => `${subjectCode}-${g}`);
        const classDocs = await Class.find({ classId: { $in: classIds } }).lean();
        const classMap = {};
        classDocs.forEach(c => { classMap[c.classId] = c; });

        const objIds = classDocs.map(c => c._id);
        const sessions = await Session.find({ class: { $in: objIds } }).sort({ startTime: 1 }).lean();

        // Map session._id → { classObjId, date }
        const sessInfo = {};
        sessions.forEach(s => {
            sessInfo[s._id.toString()] = {
                classId: s.class.toString(),
                date: s.startTime.toISOString().split('T')[0],
            };
        });

        // Aggregate attendance by session + status
        const sessIds = sessions.map(s => s._id);
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessIds } } },
            { $group: { _id: { session: '$session', status: '$status' }, count: { $sum: 1 } } }
        ]);

        // Build map: sessionId → { Present, Late }
        const attBySess = {};
        attAgg.forEach(({ _id, count }) => {
            const k = _id.session.toString();
            if (!attBySess[k]) attBySess[k] = { Present: 0, Late: 0 };
            attBySess[k][_id.status] = count;
        });

        // Build per-class daily arrays
        // classObjId → classId string
        const objToClassId = {};
        classDocs.forEach(c => { objToClassId[c._id.toString()] = c.classId; });

        const result = {};
        const dateSet = new Set();
        GROUPS.forEach(g => { result[g] = []; });

        sessions.forEach(sess => {
            const sk = sess._id.toString();
            const classObjId = sess.class.toString();
            const classIdStr = objToClassId[classObjId];
            const group = classIdStr?.split('-')[1];
            if (!group) return;
            const cls = classMap[classIdStr];
            if (!cls) return;
            const totalStudents = cls.students.length;
            const present = attBySess[sk]?.Present || 0;
            const late    = attBySess[sk]?.Late    || 0;
            const absent  = totalStudents - present - late;
            const pct     = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 1000) / 10 : 0;
            const dateStr  = sess.startTime.toISOString().split('T')[0];
            dateSet.add(dateStr);
            result[group].push({ date: dateStr, present, late, absent, total: totalStudents, pct });
        });

        const dates = Array.from(dateSet).sort();
        res.json({ subjectCode, groups: GROUPS, dates, daily: result });
    } catch (err) {
        console.error('group-subject-daily error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/group-day-pies/:subjectCode/:date
// @desc    Pie breakdown for each group on a specific date
// @access  Teacher
router.get('/group-day-pies/:subjectCode/:date', auth, authorize('teacher'), async (req, res) => {
    try {
        const GROUPS = ['G18', 'G19', 'G20', 'G21', 'G22'];
        const subjectCode = req.params.subjectCode.toUpperCase();
        const dateStr = req.params.date;
        const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
        const endOfDay   = new Date(dateStr + 'T23:59:59.999Z');

        const classIds = GROUPS.map(g => `${subjectCode}-${g}`);
        const classDocs = await Class.find({ classId: { $in: classIds } }).lean();
        const classMap = {};
        classDocs.forEach(c => { classMap[c.classId] = c; });

        const objIds = classDocs.map(c => c._id);
        const sessions = await Session.find({
            class: { $in: objIds },
            startTime: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        // session class._id → session
        const sessByClass = {};
        sessions.forEach(s => { sessByClass[s.class.toString()] = s; });

        const sessIds = sessions.map(s => s._id);
        const attAgg = sessIds.length > 0 ? await Attendance.aggregate([
            { $match: { session: { $in: sessIds } } },
            { $group: { _id: { session: '$session', status: '$status' }, count: { $sum: 1 } } }
        ]) : [];

        const attBySess = {};
        attAgg.forEach(({ _id, count }) => {
            const k = _id.session.toString();
            if (!attBySess[k]) attBySess[k] = {};
            attBySess[k][_id.status] = count;
        });

        const pies = {};
        for (const group of GROUPS) {
            const cls = classMap[`${subjectCode}-${group}`];
            if (!cls) { pies[group] = null; continue; }
            const sess = sessByClass[cls._id.toString()];
            if (!sess) { pies[group] = null; continue; }
            const sk = sess._id.toString();
            const totalStudents = cls.students.length;
            const present = attBySess[sk]?.Present || 0;
            const late    = attBySess[sk]?.Late    || 0;
            const absent  = totalStudents - present - late;
            const pct     = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 1000) / 10 : 0;
            pies[group] = { present, late, absent, total: totalStudents, pct };
        }

        res.json({ subjectCode, date: dateStr, groups: GROUPS, pies });
    } catch (err) {
        console.error('group-day-pies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
