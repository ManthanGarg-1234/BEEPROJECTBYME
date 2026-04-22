const express = require('express');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { calculateAttendancePercentage, getWarningLevel, evaluateClassAttendance } = require('../utils/evaluationEngine');
const { sendWarningEmail } = require('../utils/emailService');
const {
    getComprehensiveStudentAnalytics,
    getClassInsights,
    calculateRiskAssessment,
    calculateTemporalAnalysis,
    generateRecommendation
} = require('../utils/advancedAnalytics');

const router = express.Router();

// @route   GET /api/analytics/dashboard/:classId
// @desc    Get teacher dashboard stats
// @access  Teacher
router.get('/dashboard/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id })
            .populate('students', 'name email rollNumber lastWarningSentAt');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or you do not have access' });
        }

        // Fetch all sessions once
        const sessions = await Session.find({ class: classDoc._id }).select('_id').lean();
        const totalSessions = sessions.length;
        const sessionIds = sessions.map(s => s._id);

        // Single aggregate: count Present per student across all sessions
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds }, class: classDoc._id } },
            { $group: { _id: { student: '$student', status: '$status' }, count: { $sum: 1 } } }
        ]);

        // Build a map: studentId -> { Present: n, Late: n }
        const attMap = {};
        for (const { _id, count } of attAgg) {
            const sid = _id.student.toString();
            if (!attMap[sid]) attMap[sid] = { Present: 0, Late: 0 };
            if (_id.status === 'Present' || _id.status === 'Late') {
                attMap[sid][_id.status] = count;
            }
        }

        let totalPercentage = 0;
        let belowThreshold = 0;
        const studentStats = classDoc.students.map(student => {
            const rec = attMap[student._id.toString()] || { Present: 0, Late: 0 };
            const presentCount = rec.Present;
            const percentage = totalSessions > 0
                ? Math.round((presentCount / totalSessions) * 10000) / 100
                : 100;
            const warningLevel = getWarningLevel(percentage);
            if (percentage < 75) belowThreshold++;
            totalPercentage += percentage;
            return {
                _id: student._id,
                name: student.name,
                rollNumber: student.rollNumber,
                email: student.email,
                percentage,
                presentCount,
                totalSessions,
                warningLevel,
                lastWarningSentAt: student.lastWarningSentAt || null
            };
        });

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
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or you do not have access' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 }).lean();
        const totalStudents = classDoc.students.length;
        const sessionIds = sessions.map(s => s._id);

        // Single aggregation: count by session + status
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds } } },
            { $group: { _id: { session: '$session', status: '$status' }, count: { $sum: 1 } } }
        ]);

        // Build map: sessionId -> { Present, Late }
        const attMap = {};
        for (const { _id, count } of attAgg) {
            const k = _id.session.toString();
            if (!attMap[k]) attMap[k] = { Present: 0, Late: 0 };
            if (_id.status === 'Present' || _id.status === 'Late') attMap[k][_id.status] = count;
        }

        const dailyData = sessions.map(session => {
            const k = session._id.toString();
            const presentCount = attMap[k]?.Present || 0;
            const lateCount = attMap[k]?.Late || 0;
            const percentage = totalStudents > 0
                ? Math.round((presentCount / totalStudents) * 10000) / 100
                : 0;
            return {
                date: session.startTime.toISOString().split('T')[0],
                sessionId: session._id,
                present: presentCount,
                late: lateCount,
                absent: totalStudents - presentCount - lateCount,
                total: totalStudents,
                percentage
            };
        });

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
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id })
            .populate('students', 'name rollNumber');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or you do not have access' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 }).lean();
        const sessionIds = sessions.map(s => s._id);

        // Single aggregation: replaces O(students × sessions) individual DB finds
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds }, class: classDoc._id } },
            { $group: { _id: { session: '$session', student: '$student', status: '$status' }, count: { $sum: 1 } } }
        ]);

        // Build map: studentId_sessionId → status
        const attMap = {};
        for (const { _id } of attAgg) {
            const key = `${_id.student}_${_id.session}`;
            attMap[key] = _id.status;
        }

        const heatmapData = classDoc.students.map(student => ({
            name: student.name,
            rollNumber: student.rollNumber,
            sessions: sessions.map(session => ({
                date: session.startTime.toISOString().split('T')[0],
                status: attMap[`${student._id}_${session._id}`] || 'Absent'
            }))
        }));

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
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id })
            .populate('students', 'name rollNumber email');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or you do not have access' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 }).lean();
        const sessionIds = sessions.map(s => s._id);

        // Single aggregation: replaces O(students × sessions) individual DB finds
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds }, class: classDoc._id } },
            { $project: { session: 1, student: 1, status: 1 } }
        ]);

        // Build map: studentId_sessionId → status
        const attMap = {};
        for (const rec of attAgg) {
            attMap[`${rec.student}_${rec.session}`] = rec.status;
        }

        const rows = [];
        for (const student of classDoc.students) {
            const row = {
                'Roll Number': student.rollNumber,
                'Name': student.name,
                'Email': student.email
            };

            let presentCount = 0;
            for (const session of sessions) {
                const dateKey = session.startTime.toISOString().split('T')[0];
                const status = attMap[`${student._id}_${session._id}`] || 'Absent';
                row[dateKey] = status;
                if (status === 'Present') presentCount++;
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
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or you do not have access' });
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
        const studentId = req.user._id;

        // Get all classes the student is enrolled in
        const classes = await Class.find({ students: studentId }).populate('teacher', 'name').lean();

        if (!classes.length) {
            return res.json({ student: { name: req.user.name, email: req.user.email, rollNumber: req.user.rollNumber }, classes: [] });
        }

        const classIds = classes.map(c => c._id);

        // 1 query: all sessions for all enrolled classes
        const allSessions = await Session.find({ class: { $in: classIds } }).sort({ startTime: 1 }).lean();

        // 1 query: all attendance records for this student across all enrolled classes
        const allAttendance = await Attendance.find({ student: studentId, class: { $in: classIds } })
            .select('session class status').lean();

        // Build fast lookup maps
        const sessionsByClass = {}; // classId_str -> [session]
        for (const s of allSessions) {
            const k = s.class.toString();
            if (!sessionsByClass[k]) sessionsByClass[k] = [];
            sessionsByClass[k].push(s);
        }

        const attBySession = {}; // sessionId_str -> status
        for (const a of allAttendance) {
            attBySession[a.session.toString()] = a.status;
        }

        const classData = classes.map(cls => {
            const k = cls._id.toString();
            const sessions = sessionsByClass[k] || [];
            const totalSessions = sessions.length;

            let presentCount = 0;
            const attendanceTimeline = sessions.map(session => {
                const status = attBySession[session._id.toString()] || 'Absent';
                if (status === 'Present') presentCount++;
                return { date: session.startTime.toISOString().split('T')[0], status };
            });

            const percentage = totalSessions > 0
                ? Math.round((presentCount / totalSessions) * 10000) / 100
                : 100;
            const warningLevel = getWarningLevel(percentage);

            return {
                classId: cls.classId,
                subject: cls.subject,
                teacher: cls.teacher?.name || 'Unknown',
                percentage,
                presentCount,
                totalSessions,
                warningLevel,
                semesterProgress: cls.semesterProgress,
                attendanceTimeline
            };
        });

        res.json({
            student: { name: req.user.name, email: req.user.email, rollNumber: req.user.rollNumber },
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
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() }).lean();
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        // verify student is enrolled
        const enrolled = classDoc.students.some(s => s.toString() === req.user._id.toString());
        if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this class' });

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 }).lean();
        const totalStudents = classDoc.students.length;
        const sessionIds = sessions.map(s => s._id);

        // Single aggregation instead of 2 countDocuments per session
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds } } },
            { $group: { _id: { session: '$session', status: '$status' }, count: { $sum: 1 } } }
        ]);

        const attMap = {};
        for (const { _id, count } of attAgg) {
            const k = _id.session.toString();
            if (!attMap[k]) attMap[k] = { Present: 0, Late: 0 };
            if (_id.status === 'Present' || _id.status === 'Late') attMap[k][_id.status] = count;
        }

        const daily = sessions.map(session => {
            const k = session._id.toString();
            const present = attMap[k]?.Present || 0;
            const late = attMap[k]?.Late || 0;
            const absent = totalStudents - present - late;
            const pct = totalStudents > 0 ? Math.round((present / totalStudents) * 1000) / 10 : 0;
            return {
                date: session.startTime.toISOString().split('T')[0],
                present, late, absent,
                total: totalStudents,
                percentage: pct,
            };
        });

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
        // Dynamically derive groups and subjects from teacher's own classes
        const allClasses = await Class.find({ teacher: req.user._id }).lean();

        // Extract unique subject codes and group identifiers from classId format: CODE-GROUP
        const subjectMap = {};
        const groupSet = new Set();
        allClasses.forEach(c => {
            const dashIdx = c.classId.indexOf('-');
            if (dashIdx === -1) return;
            const code = c.classId.substring(0, dashIdx);
            const group = c.classId.substring(dashIdx + 1);
            if (!subjectMap[code]) subjectMap[code] = c.subject || code;
            groupSet.add(group);
        });
        const SUBJECTS = Object.entries(subjectMap).map(([code, name]) => ({ code, name }));
        const GROUPS = Array.from(groupSet).sort();

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
                const late = attMap[k]?.Late || 0;
                const totalSlots = totalStudents * totalSessions;
                const absent = totalSlots - present - late;
                const pct = totalSlots > 0 ? Math.round(((present + late) / totalSlots) * 1000) / 10 : 0;
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
        const subjectCode = req.params.subjectCode.toUpperCase();

        // Dynamically find all classes for this subject owned by this teacher
        const classDocs = await Class.find({
            classId: { $regex: new RegExp(`^${subjectCode}-`, 'i') },
            teacher: req.user._id
        }).lean();
        if (classDocs.length === 0) {
            return res.status(403).json({ message: 'You do not teach this subject' });
        }

        // Derive GROUPS dynamically from the matched classes
        const GROUPS = classDocs.map(c => {
            const dashIdx = c.classId.indexOf('-');
            return dashIdx !== -1 ? c.classId.substring(dashIdx + 1) : c.classId;
        }).sort();

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
            const dashIdx = classIdStr ? classIdStr.indexOf('-') : -1;
            const group = dashIdx !== -1 ? classIdStr.substring(dashIdx + 1) : null;
            if (!group) return;
            const cls = classMap[classIdStr];
            if (!cls) return;
            const totalStudents = cls.students.length;
            const present = attBySess[sk]?.Present || 0;
            const late = attBySess[sk]?.Late || 0;
            const absent = totalStudents - present - late;
            const pct = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 1000) / 10 : 0;
            const dateStr = sess.startTime.toISOString().split('T')[0];
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
        const subjectCode = req.params.subjectCode.toUpperCase();
        const dateStr = req.params.date;
        const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
        const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

        // Dynamically find all classes for this subject owned by this teacher
        const classDocs = await Class.find({
            classId: { $regex: new RegExp(`^${subjectCode}-`, 'i') },
            teacher: req.user._id
        }).lean();
        if (classDocs.length === 0) {
            return res.status(403).json({ message: 'You do not teach this subject' });
        }

        // Derive GROUPS dynamically
        const GROUPS = classDocs.map(c => {
            const dashIdx = c.classId.indexOf('-');
            return dashIdx !== -1 ? c.classId.substring(dashIdx + 1) : c.classId;
        }).sort();

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
            const late = attBySess[sk]?.Late || 0;
            const absent = totalStudents - present - late;
            const pct = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 1000) / 10 : 0;
            pies[group] = { present, late, absent, total: totalStudents, pct };
        }

        res.json({ subjectCode, date: dateStr, groups: GROUPS, pies });
    } catch (err) {
        console.error('group-day-pies error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/analytics/send-warning-email
// @desc    Send attendance warning email to a single student
// @access  Teacher
router.post('/send-warning-email', auth, authorize('teacher'), async (req, res) => {
    try {
        const { studentId, classId } = req.body;
        if (!studentId || !classId) {
            return res.status(400).json({ message: 'studentId and classId are required' });
        }

        // Verify teacher owns this class
        const classDoc = await Class.findOne({ classId: classId.toUpperCase(), teacher: req.user._id }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or access denied' });
        }

        // Get student info
        const student = await User.findById(studentId).select('name email rollNumber');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Calculate attendance percentage for this class
        const sessions = await Session.find({ class: classDoc._id }).select('_id').lean();
        const totalSessions = sessions.length;
        if (totalSessions === 0) {
            return res.status(400).json({ message: 'No sessions found for this class' });
        }
        const sessionIds = sessions.map(s => s._id);

        const attCount = await Attendance.countDocuments({
            session: { $in: sessionIds },
            student: studentId,
            status: { $in: ['Present', 'Late'] }
        });

        const percentage = Math.round((attCount / totalSessions) * 10000) / 100;
        const warningLevel = getWarningLevel(percentage);

        // Send warning email
        const sent = await sendWarningEmail(student.email, student.name, {
            subject: classDoc.subject,
            percentage,
            warningLevel: warningLevel || 'Warning'
        });

        // Update lastWarningSentAt on the student
        await User.findByIdAndUpdate(studentId, { lastWarningSentAt: new Date() });

        if (!sent) {
            return res.status(500).json({ message: 'Email could not be sent. Check SMTP configuration.' });
        }

        res.json({
            success: true,
            message: `Warning email sent to ${student.name} (${student.email})`,
            percentage
        });
    } catch (error) {
        console.error('Send warning email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/analytics/send-bulk-warnings
// @desc    Send attendance warning emails to all students below 75% in a class
// @access  Teacher
router.post('/send-bulk-warnings', auth, authorize('teacher'), async (req, res) => {
    try {
        const { classId } = req.body;
        if (!classId) {
            return res.status(400).json({ message: 'classId is required' });
        }

        // Verify teacher owns this class
        const classDoc = await Class.findOne({ classId: classId.toUpperCase(), teacher: req.user._id })
            .populate('students', 'name email rollNumber lastWarningSentAt');
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or access denied' });
        }

        const sessions = await Session.find({ class: classDoc._id }).select('_id').lean();
        const totalSessions = sessions.length;
        if (totalSessions === 0) {
            return res.status(400).json({ message: 'No sessions found for this class' });
        }
        const sessionIds = sessions.map(s => s._id);

        // Aggregate attendance counts per student
        const attAgg = await Attendance.aggregate([
            { $match: { session: { $in: sessionIds }, class: classDoc._id, status: { $in: ['Present', 'Late'] } } },
            { $group: { _id: '$student', count: { $sum: 1 } } }
        ]);
        const attMap = {};
        attAgg.forEach(({ _id, count }) => { attMap[_id.toString()] = count; });

        const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();

        let sent = 0, failed = 0, skipped = 0;
        const results = [];

        for (const student of classDoc.students) {
            const presentCount = attMap[student._id.toString()] || 0;
            const percentage = Math.round((presentCount / totalSessions) * 10000) / 100;

            if (percentage >= 75) continue; // Only warn below-threshold students

            // Skip if warned recently (within cooldown period)
            if (student.lastWarningSentAt && (now - new Date(student.lastWarningSentAt).getTime()) < COOLDOWN_MS) {
                skipped++;
                results.push({ name: student.name, status: 'skipped', reason: 'Recently warned' });
                continue;
            }

            const warningLevel = getWarningLevel(percentage);
            try {
                const emailSent = await sendWarningEmail(student.email, student.name, {
                    subject: classDoc.subject,
                    percentage,
                    warningLevel: warningLevel || 'Warning'
                });

                if (emailSent) {
                    await User.findByIdAndUpdate(student._id, { lastWarningSentAt: new Date() });
                    sent++;
                    results.push({ name: student.name, status: 'sent', percentage });
                } else {
                    failed++;
                    results.push({ name: student.name, status: 'failed' });
                }
            } catch (e) {
                failed++;
                results.push({ name: student.name, status: 'failed', error: e.message });
            }
        }

        res.json({
            success: true,
            message: `Bulk warning complete: ${sent} sent, ${failed} failed, ${skipped} skipped (recently warned)`,
            sent, failed, skipped, results
        });
    } catch (error) {
        console.error('Bulk warning error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════════════
   ADVANCED ANALYTICS ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════════════ */

// @route   GET /api/analytics/advanced/student/:classId
// @desc    Get comprehensive student analytics with trends, comparisons, and risk assessment
// @access  Student (own classes) / Teacher (their classes)
router.get('/advanced/student/:classId', auth, async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Determine if student or teacher is accessing
        const isTeacher = req.user.role === 'teacher' && classDoc.teacher.toString() === req.user._id.toString();
        const isStudent = req.user.role === 'student' && classDoc.students.some(s => s.toString() === req.user._id.toString());

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const studentId = req.query.studentId || req.user._id;

        // Verify access
        if (!isTeacher && studentId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Cannot view other students\' analytics' });
        }

        const analytics = await getComprehensiveStudentAnalytics(studentId, classDoc._id);
        res.json(analytics);
    } catch (error) {
        console.error('Advanced student analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/advanced/class/:classId
// @desc    Get class-level insights and statistics
// @access  Teacher (their classes)
router.get('/advanced/class/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or access denied' });
        }

        const insights = await getClassInsights(classDoc._id);
        res.json(insights);
    } catch (error) {
        console.error('Class insights error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/advanced/risk-assessment/:classId
// @desc    Get risk assessment for all students in a class
// @access  Teacher (their classes)
router.get('/advanced/risk-assessment/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id })
            .populate('students', 'name email rollNumber');
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or access denied' });
        }

        const sessions = await Session.find({ class: classDoc._id }).sort({ startTime: 1 }).lean();
        if (sessions.length === 0) {
            return res.json({ classId: classDoc.classId, students: [] });
        }

        const riskAssessments = [];

        for (const student of classDoc.students) {
            const risk = await calculateRiskAssessment(student._id, classDoc._id, sessions);
            riskAssessments.push({
                studentId: student._id,
                name: student.name,
                email: student.email,
                rollNumber: student.rollNumber,
                ...risk
            });
        }

        // Sort by risk score (highest first)
        riskAssessments.sort((a, b) => b.riskScore - a.riskScore);

        res.json({
            classId: classDoc.classId,
            subject: classDoc.subject,
            totalStudents: classDoc.students.length,
            assessmentDate: new Date().toISOString(),
            students: riskAssessments
        });
    } catch (error) {
        console.error('Risk assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/advanced/temporal/:classId
// @desc    Get temporal analysis (day-of-week, monthly patterns) for a student
// @access  Student / Teacher
router.get('/advanced/temporal/:classId', auth, async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Determine access
        const isTeacher = req.user.role === 'teacher' && classDoc.teacher.toString() === req.user._id.toString();
        const isStudent = req.user.role === 'student' && classDoc.students.some(s => s.toString() === req.user._id.toString());

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const studentId = req.query.studentId || req.user._id;

        // Verify access
        if (!isTeacher && studentId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Cannot view other students\' analytics' });
        }

        const temporal = await calculateTemporalAnalysis(studentId, classDoc._id);
        res.json({
            classId: classDoc.classId,
            studentId,
            temporal
        });
    } catch (error) {
        console.error('Temporal analysis error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/analytics/advanced/class-risk-summary/:classId
// @desc    Get summary of risk distribution in class
// @access  Teacher (their classes)
router.get('/advanced/class-risk-summary/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase(), teacher: req.user._id }).lean();
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found or access denied' });
        }

        const insights = await getClassInsights(classDoc._id);
        res.json({
            classId: classDoc.classId,
            subject: classDoc.subject,
            riskDistribution: insights.riskDistribution,
            avgAttendance: insights.avgAttendance,
            healthScore: insights.healthScore,
            totalStudents: insights.totalStudents,
            criticalCount: insights.riskDistribution.critical,
            recommendedAction: insights.riskDistribution.critical > 0
                ? `${insights.riskDistribution.critical} student(s) need immediate attention`
                : 'Class attendance is healthy'
        });
    } catch (error) {
        console.error('Class risk summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

