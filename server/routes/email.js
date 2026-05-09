const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const EmailLog = require('../models/EmailLog');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { sendLowAttendanceWarning, EMAIL_ENABLED } = require('../utils/emailService');

const ATTENDANCE_THRESHOLD = parseInt(process.env.ATTENDANCE_THRESHOLD) || 75;

// ── Helper: calculate attendance for students in a class ────────────────────
// Matches evaluationEngine.js logic: total = session count, attended = 'Present' only
const Session = require('../models/Session');

async function calcStudentAttendance(studentIds, classId) {
    const sessions = await Session.find({ class: classId }).select('_id').lean();
    const totalSessions = sessions.length;
    const sessionIds = sessions.map(s => s._id);

    const results = [];
    for (const sid of studentIds) {
        const presentCount = totalSessions > 0
            ? await Attendance.countDocuments({ student: sid, session: { $in: sessionIds }, class: classId, status: 'Present' })
            : 0;
        const percentage = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 100;
        results.push({ studentId: sid, totalClasses: totalSessions, classesAttended: presentCount, attendance: Math.round(percentage * 10) / 10 });
    }
    return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/email/defaulters/:classId
// Returns all students below threshold with institutional + actual emails
// ══════════════════════════════════════════════════════════════════════════════
router.get('/defaulters/:classId', auth, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.classId).populate('students', '_id email actualEmail name rollNumber role');
        if (!classData) return res.status(404).json({ message: 'Class not found' });
        if (!classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

        const threshold = parseInt(req.query.threshold) || ATTENDANCE_THRESHOLD;
        const attData = await calcStudentAttendance(classData.students.map(s => s._id), classData._id);

        const defaulters = [];
        for (const student of classData.students) {
            const att = attData.find(a => a.studentId.equals(student._id));
            if (att && att.attendance < threshold) {
                defaulters.push({
                    _id: student._id,
                    name: student.name,
                    rollNumber: student.rollNumber,
                    email: student.email,
                    actualEmail: student.actualEmail || student.email,
                    institutionalEmail: student.institutionalEmail,
                    attendance: att.attendance,
                    totalClasses: att.totalClasses,
                    classesAttended: att.classesAttended
                });
            }
        }

        // Teacher info
        const teacher = await User.findById(req.user._id).select('name email role');

        res.json({
            class: { _id: classData._id, classId: classData.classId, subject: classData.subject },
            teacher: { name: teacher.name, institutionalEmail: teacher.institutionalEmail },
            threshold,
            totalStudents: classData.students.length,
            defaulterCount: defaulters.length,
            students: defaulters.sort((a, b) => a.attendance - b.attendance)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching defaulters' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/email/send-single/:classId/:studentId
// Send warning email to ONE specific student
// ══════════════════════════════════════════════════════════════════════════════
router.post('/send-single/:classId/:studentId', auth, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.classId);
        if (!classData) return res.status(404).json({ message: 'Class not found' });
        if (!classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

        const student = await User.findById(req.params.studentId).select('name email actualEmail rollNumber role');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const teacher = await User.findById(req.user._id).select('name email role');
        const [att] = await calcStudentAttendance([student._id], classData._id);

        // Check duplicate (24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await EmailLog.findOne({
            class: classData._id,
            'recipients.student': student._id,
            sentAt: { $gte: oneDayAgo },
            teacher: req.user._id
        });
        if (recent) {
            return res.status(429).json({ message: `Email already sent to ${student.name} within 24 hours`, lastSentAt: recent.sentAt });
        }

        const toEmail = student.getNotificationEmail();
        const batchId = uuidv4();

        const result = await sendLowAttendanceWarning({
            toEmail,
            studentName: student.name,
            subject: classData.subject,
            attendance: att.attendance,
            classesAttended: att.classesAttended,
            totalClasses: att.totalClasses,
            teacherName: teacher.name,
            teacherInstitutionalEmail: teacher.institutionalEmail,
            studentInstitutionalEmail: student.institutionalEmail
        });

        // Log
        const emailLog = new EmailLog({
            teacher: req.user._id,
            class: classData._id,
            classId: classData.classId,
            subject_code: classData.classId.split('-')[0],
            subject: `Low Attendance Warning — ${classData.subject}`,
            body: `Warning sent to ${student.name} (${att.attendance}%)`,
            template: 'low-attendance-warning',
            batchId,
            totalRecipients: 1,
            successCount: result.success ? 1 : 0,
            failureCount: result.success ? 0 : 1,
            gmailTokenUsed: false,
            gmailAccountEmail: process.env.SMTP_USER,
            sentAt: new Date(),
            completedAt: new Date(),
            recipients: [{
                student: student._id,
                email: toEmail,
                name: student.name,
                attendance: att.attendance,
                status: result.success ? 'sent' : 'failed',
                failureReason: result.error || null,
                gmailMessageId: result.messageId || null
            }]
        });
        await emailLog.save();

        if (!result.success) {
            return res.status(400).json({ message: `Failed to send email: ${result.error}`, batchId });
        }

        res.json({ message: `Email sent to ${student.name}`, batchId, result: { success: 1, failed: 0 } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending email' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/email/send-all-defaulters/:classId
// Bulk send to ALL defaulters in a class
// ══════════════════════════════════════════════════════════════════════════════
router.post('/send-all-defaulters/:classId', auth, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.classId).populate('students', '_id email actualEmail name rollNumber role');
        if (!classData) return res.status(404).json({ message: 'Class not found' });
        if (!classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

        const teacher = await User.findById(req.user._id).select('name email role');
        const threshold = parseInt(req.query.threshold) || ATTENDANCE_THRESHOLD;
        const attData = await calcStudentAttendance(classData.students.map(s => s._id), classData._id);

        // Filter defaulters
        const defaulters = [];
        for (const student of classData.students) {
            const att = attData.find(a => a.studentId.equals(student._id));
            if (att && att.attendance < threshold) {
                defaulters.push({ student, att });
            }
        }

        if (defaulters.length === 0) {
            return res.json({ message: 'No defaulters found', result: { success: 0, failed: 0, skipped: 0 } });
        }

        // Check duplicates (skip students emailed in last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const batchId = uuidv4();
        const recipients = [];
        let successCount = 0, failureCount = 0, skippedCount = 0;

        for (const { student, att } of defaulters) {
            // Duplicate check
            const recent = await EmailLog.findOne({
                class: classData._id, 'recipients.student': student._id,
                sentAt: { $gte: oneDayAgo }, teacher: req.user._id
            });
            if (recent) {
                skippedCount++;
                recipients.push({ student: student._id, email: student.email, name: student.name, attendance: att.attendance, status: 'failed', failureReason: 'Duplicate — sent within 24h' });
                continue;
            }

            const toEmail = student.getNotificationEmail();
            const result = await sendLowAttendanceWarning({
                toEmail, studentName: student.name, subject: classData.subject,
                attendance: att.attendance, classesAttended: att.classesAttended, totalClasses: att.totalClasses,
                teacherName: teacher.name, teacherInstitutionalEmail: teacher.institutionalEmail,
                studentInstitutionalEmail: student.institutionalEmail
            });

            recipients.push({
                student: student._id, email: toEmail, name: student.name, attendance: att.attendance,
                status: result.success ? 'sent' : 'failed',
                failureReason: result.error || null,
                gmailMessageId: result.messageId || null
            });
            if (result.success) successCount++; else failureCount++;
        }

        // Log
        const emailLog = new EmailLog({
            teacher: req.user._id, class: classData._id, classId: classData.classId,
            subject_code: classData.classId.split('-')[0],
            subject: `Low Attendance Warning — ${classData.subject}`,
            body: `Bulk warning sent to ${defaulters.length} defaulters`,
            template: 'low-attendance-warning', batchId,
            totalRecipients: defaulters.length, successCount, failureCount,
            gmailTokenUsed: false, gmailAccountEmail: process.env.SMTP_USER,
            sentAt: new Date(), completedAt: new Date(), recipients
        });
        await emailLog.save();

        res.json({
            message: `Bulk send complete: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped (duplicate)`,
            batchId,
            result: { success: successCount, failed: failureCount, skipped: skippedCount, total: defaulters.length }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending bulk emails' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/email/retry/:batchId
// Retry failed emails from a previous batch
// ══════════════════════════════════════════════════════════════════════════════
router.post('/retry/:batchId', auth, async (req, res) => {
    try {
        const log = await EmailLog.findOne({ batchId: req.params.batchId, teacher: req.user._id });
        if (!log) return res.status(404).json({ message: 'Batch not found' });

        const classData = await Class.findById(log.class);
        if (!classData) return res.status(404).json({ message: 'Class not found' });

        const teacher = await User.findById(req.user._id).select('name email role');
        const failedRecipients = log.recipients.filter(r => r.status === 'failed');
        if (failedRecipients.length === 0) return res.json({ message: 'No failed emails to retry' });

        let retrySuccess = 0, retryFail = 0;
        for (const recipient of failedRecipients) {
            const student = await User.findById(recipient.student).select('name email actualEmail rollNumber role');
            if (!student) continue;

            const [att] = await calcStudentAttendance([student._id], classData._id);
            const toEmail = student.getNotificationEmail();

            const result = await sendLowAttendanceWarning({
                toEmail, studentName: student.name, subject: classData.subject,
                attendance: att.attendance, classesAttended: att.classesAttended, totalClasses: att.totalClasses,
                teacherName: teacher.name, teacherInstitutionalEmail: teacher.institutionalEmail,
                studentInstitutionalEmail: student.institutionalEmail
            });

            // Update recipient status in the log
            recipient.status = result.success ? 'sent' : 'failed';
            recipient.failureReason = result.error || null;
            recipient.gmailMessageId = result.messageId || null;
            if (result.success) { retrySuccess++; log.successCount++; log.failureCount--; }
            else retryFail++;
        }

        await log.save();
        res.json({ message: `Retry complete: ${retrySuccess} sent, ${retryFail} still failed`, retrySuccess, retryFail });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error retrying emails' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// EXISTING ROUTES (preserved) — low-attendance, preview, send, history, log, check-duplicate
// ══════════════════════════════════════════════════════════════════════════════

// Get low attendance students for a class (legacy)
router.get('/low-attendance/:classId', auth, async (req, res) => {
    try {
        const { classId } = req.params;
        const threshold = req.query.threshold || 75;
        const classData = await Class.findOne({ _id: classId }).populate('students', '_id email name rollNumber');
        if (!classData) return res.status(404).json({ message: 'Class not found' });
        if (!classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'You can only send emails for your own classes' });

        const lowAttendanceStudents = [];
        for (const student of classData.students) {
            const total = await Attendance.countDocuments({ student: student._id, class: classId });
            const present = await Attendance.countDocuments({ student: student._id, class: classId, status: 'Present' });
            const late = await Attendance.countDocuments({ student: student._id, class: classId, status: 'Late' });
            const markAsPresent = present + late;
            const percentage = total > 0 ? (markAsPresent / total) * 100 : 0;
            if (percentage < threshold) {
                lowAttendanceStudents.push({
                    _id: student._id, name: student.name, email: student.email,
                    rollNumber: student.rollNumber, attendance: Math.round(percentage),
                    totalClasses: total, classesAttended: markAsPresent
                });
            }
        }

        res.json({
            class: { _id: classData._id, classId: classData.classId, subject: classData.subject },
            threshold, totalStudents: classData.students.length,
            lowAttendanceCount: lowAttendanceStudents.length,
            students: lowAttendanceStudents.sort((a, b) => a.attendance - b.attendance)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching low attendance students' });
    }
});

// Preview email
router.post('/preview', [auth, check('classId').notEmpty(), check('studentIds').isArray(), check('subject').notEmpty(), check('body').notEmpty()], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
        const { classId, studentIds, subject, body } = req.body;
        const classData = await Class.findOne({ _id: classId });
        if (!classData || !classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });
        const students = await User.find({ _id: { $in: studentIds } }, 'email name attendance');
        let preview = body;
        if (students.length > 0) {
            const student = students[0];
            preview = body.replace('{studentName}', student.name).replace('{className}', classData.subject).replace('{classId}', classData.classId);
        }
        res.json({ recipients: students.map(s => ({ name: s.name, email: s.email })), subject, preview, recipientCount: students.length });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error generating preview' }); }
});

// Send emails (legacy)
router.post('/send', [auth, check('classId').notEmpty(), check('studentIds').isArray(), check('subject').notEmpty(), check('body').notEmpty()], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
        const { classId, studentIds, subject, body, template } = req.body;
        const batchId = uuidv4();
        const classData = await Class.findOne({ _id: classId }).populate('students', '_id email name rollNumber');
        if (!classData || !classData.teacher.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });
        const students = await User.find({ _id: { $in: studentIds } }, '_id email name rollNumber');
        if (students.length === 0) return res.status(400).json({ message: 'No valid students provided' });
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST || !process.env.SMTP_PORT) {
            return res.status(400).json({ message: 'Email service not configured.' });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_PORT == 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        const results = { success: [], failed: [], batchId };
        const emailLog = new EmailLog({
            teacher: req.user._id, class: classId, classId: classData.classId,
            subject_code: classData.classId.split('-')[0], subject, body,
            template: template || 'custom', batchId, totalRecipients: students.length,
            gmailTokenUsed: false, gmailAccountEmail: process.env.SMTP_USER, sentAt: new Date()
        });

        for (const student of students) {
            try {
                const personalizedBody = body.replace('{studentName}', student.name).replace('{className}', classData.subject).replace('{classId}', classData.classId);
                const mailResult = await transporter.sendMail({
                    from: `"${req.user.name}" <${process.env.SMTP_USER}>`, to: student.email,
                    subject, html: `<pre>${personalizedBody}</pre>`, replyTo: req.user.email
                });
                emailLog.recipients.push({ student: student._id, email: student.email, name: student.name, status: 'sent', gmailMessageId: mailResult.messageId || mailResult.response });
                results.success.push({ studentId: student._id, email: student.email, status: 'sent' });
                emailLog.successCount++;
            } catch (err) {
                emailLog.recipients.push({ student: student._id, email: student.email, name: student.name, status: 'failed', failureReason: err.message });
                results.failed.push({ studentId: student._id, email: student.email, reason: err.message });
                emailLog.failureCount++;
            }
        }

        emailLog.completedAt = new Date();
        await emailLog.save();
        if (results.success.length === 0 && results.failed.length > 0) {
            return res.status(400).json({ message: `Failed to send all ${results.failed.length} emails.`, batchId, results: { success: results.success.length, failed: results.failed.length, details: results.failed.slice(0, 3) } });
        }
        res.json({ message: `${results.success.length} sent, ${results.failed.length} failed`, batchId, results: { success: results.success.length, failed: results.failed.length, details: results } });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error sending emails', error: err.message }); }
});

// History
router.get('/history', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const classId = req.query.classId;
        let query = { teacher: req.user._id };
        if (classId) query.class = classId;
        const logs = await EmailLog.find(query).populate('class', 'classId subject').sort({ sentAt: -1 }).limit(limit).skip(skip).select('-recipients');
        const total = await EmailLog.countDocuments(query);
        res.json({
            total, count: logs.length, limit, skip,
            logs: logs.map(log => ({
                _id: log._id, batchId: log.batchId, class: log.class, subject: log.subject,
                template: log.template, totalRecipients: log.totalRecipients,
                successCount: log.successCount, failureCount: log.failureCount,
                sentAt: log.sentAt, completedAt: log.completedAt
            }))
        });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error fetching email history' }); }
});

// Log detail
router.get('/log/:batchId', auth, async (req, res) => {
    try {
        const log = await EmailLog.findOne({ batchId: req.params.batchId, teacher: req.user._id }).populate('class', 'classId subject');
        if (!log) return res.status(404).json({ message: 'Email log not found' });
        res.json({
            batchId: log.batchId, class: log.class, subject: log.subject, body: log.body,
            totalRecipients: log.totalRecipients, successCount: log.successCount, failureCount: log.failureCount,
            sentAt: log.sentAt, completedAt: log.completedAt, recipients: log.recipients
        });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error fetching email log' }); }
});

// Duplicate check
router.get('/check-duplicate/:classId/:studentId', auth, async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLog = await EmailLog.findOne({ class: classId, 'recipients.student': studentId, sentAt: { $gte: oneDayAgo }, teacher: req.user._id }).select('sentAt');
        if (recentLog) return res.json({ isDuplicate: true, lastSentAt: recentLog.sentAt, message: `Email already sent on ${recentLog.sentAt.toLocaleDateString()}` });
        res.json({ isDuplicate: false });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error checking duplicate' }); }
});

module.exports = router;
