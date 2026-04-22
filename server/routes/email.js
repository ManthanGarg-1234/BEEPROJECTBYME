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

// Get low attendance students for a class
// GET /api/email/low-attendance/:classId
router.get('/low-attendance/:classId', auth, async (req, res) => {
    try {
        const { classId } = req.params;
        const threshold = req.query.threshold || 75;
        
        const classData = await Class.findOne({ _id: classId }).populate('students', '_id email name rollNumber');
        if (!classData) return res.status(404).json({ message: 'Class not found' });
        
        // Check if requesting teacher owns this class
        if (!classData.teacher.equals(req.user._id)) {
            return res.status(403).json({ message: 'You can only send emails for your own classes' });
        }
        
        // Calculate attendance for each student
        const lowAttendanceStudents = [];
        
        for (const student of classData.students) {
            const total = await Attendance.countDocuments({ 
                student: student._id, 
                class: classId 
            });
            
            const present = await Attendance.countDocuments({ 
                student: student._id, 
                class: classId,
                status: 'present'
            });
            
            const late = await Attendance.countDocuments({ 
                student: student._id, 
                class: classId,
                status: 'late'
            });
            
            const markAsPresent = present + late;
            const percentage = total > 0 ? (markAsPresent / total) * 100 : 0;
            
            if (percentage < threshold) {
                lowAttendanceStudents.push({
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    rollNumber: student.rollNumber,
                    attendance: Math.round(percentage),
                    totalClasses: total,
                    classesAttended: markAsPresent
                });
            }
        }
        
        res.json({
            class: {
                _id: classData._id,
                classId: classData.classId,
                subject: classData.subject
            },
            threshold,
            totalStudents: classData.students.length,
            lowAttendanceCount: lowAttendanceStudents.length,
            students: lowAttendanceStudents.sort((a, b) => a.attendance - b.attendance)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching low attendance students' });
    }
});

// Preview email before sending
// POST /api/email/preview
router.post('/preview', [
    auth,
    check('classId').notEmpty(),
    check('studentIds').isArray(),
    check('subject').notEmpty(),
    check('body').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    try {
        const { classId, studentIds, subject, body } = req.body;
        
        // Verify class ownership
        const classData = await Class.findOne({ _id: classId });
        if (!classData || !classData.teacher.equals(req.user._id)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Fetch student details
        const students = await User.find({ _id: { $in: studentIds } }, 'email name attendance');
        
        // Generate preview with first student
        let preview = body;
        if (students.length > 0) {
            const student = students[0];
            preview = body
                .replace('{studentName}', student.name)
                .replace('{className}', classData.subject)
                .replace('{classId}', classData.classId);
        }
        
        res.json({
            recipients: students.map(s => ({ name: s.name, email: s.email })),
            subject,
            preview,
            recipientCount: students.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating preview' });
    }
});

// Send emails to students
// POST /api/email/send
router.post('/send', [
    auth,
    check('classId').notEmpty(),
    check('studentIds').isArray(),
    check('subject').notEmpty(),
    check('body').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    try {
        const { classId, studentIds, subject, body, template } = req.body;
        const batchId = uuidv4();
        
        // Verify class ownership
        const classData = await Class.findOne({ _id: classId }).populate('students', '_id email name rollNumber');
        if (!classData || !classData.teacher.equals(req.user._id)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Get students to email
        const students = await User.find({ _id: { $in: studentIds } }, '_id email name rollNumber');
        if (students.length === 0) {
            return res.status(400).json({ message: 'No valid students provided' });
        }
        
        // Validate email credentials
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(400).json({ 
                message: 'Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.' 
            });
        }

        // Create email transporter (using SMTP/Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        // Send emails and track results
        const results = {
            success: [],
            failed: [],
            batchId
        };
        
        const emailLog = new EmailLog({
            teacher: req.user._id,
            class: classId,
            classId: classData.classId,
            subject_code: classData.classId.split('-')[0],
            subject,
            body,
            template: template || 'custom',
            batchId,
            totalRecipients: students.length,
            gmailTokenUsed: false,
            gmailAccountEmail: process.env.SMTP_USER,
            sentAt: new Date()
        });
        
        for (const student of students) {
            try {
                // Personalize email
                const personalizedBody = body
                    .replace('{studentName}', student.name)
                    .replace('{className}', classData.subject)
                    .replace('{classId}', classData.classId);
                
                // Send via email
                const mailResult = await transporter.sendMail({
                    from: `"${req.user.name}" <${process.env.SMTP_USER}>`,
                    to: student.email,
                    subject,
                    html: `<pre>${personalizedBody}</pre>`,
                    replyTo: req.user.email
                });
                
                // Log success
                emailLog.recipients.push({
                    student: student._id,
                    email: student.email,
                    name: student.name,
                    status: 'sent',
                    gmailMessageId: mailResult.messageId || mailResult.response
                });
                
                results.success.push({
                    studentId: student._id,
                    email: student.email,
                    status: 'sent'
                });
                
                emailLog.successCount++;
            } catch (err) {
                // Log failure
                emailLog.recipients.push({
                    student: student._id,
                    email: student.email,
                    name: student.name,
                    status: 'failed',
                    failureReason: err.message
                });
                
                results.failed.push({
                    studentId: student._id,
                    email: student.email,
                    reason: err.message
                });
                
                emailLog.failureCount++;
            }
        }
        
        emailLog.completedAt = new Date();
        await emailLog.save();
        
        res.json({
            message: 'Emails sent',
            batchId,
            results: {
                success: results.success.length,
                failed: results.failed.length,
                details: results
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending emails', error: err.message });
    }
});

// Get email sending history
// GET /api/email/history?limit=50&skip=0&classId=xxx
router.get('/history', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const classId = req.query.classId;
        
        let query = { teacher: req.user._id };
        if (classId) query.class = classId;
        
        const logs = await EmailLog.find(query)
            .populate('class', 'classId subject')
            .sort({ sentAt: -1 })
            .limit(limit)
            .skip(skip)
            .select('-recipients'); // Don't include full recipient details in list
        
        const total = await EmailLog.countDocuments(query);
        
        res.json({
            total,
            count: logs.length,
            limit,
            skip,
            logs: logs.map(log => ({
                _id: log._id,
                batchId: log.batchId,
                class: log.class,
                subject: log.subject,
                totalRecipients: log.totalRecipients,
                successCount: log.successCount,
                failureCount: log.failureCount,
                sentAt: log.sentAt,
                completedAt: log.completedAt
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching email history' });
    }
});

// Get email log details
// GET /api/email/log/:batchId
router.get('/log/:batchId', auth, async (req, res) => {
    try {
        const log = await EmailLog.findOne({ 
            batchId: req.params.batchId,
            teacher: req.user._id 
        }).populate('class', 'classId subject subject_code');
        
        if (!log) return res.status(404).json({ message: 'Email log not found' });
        
        res.json({
            batchId: log.batchId,
            class: log.class,
            subject: log.subject,
            body: log.body,
            totalRecipients: log.totalRecipients,
            successCount: log.successCount,
            failureCount: log.failureCount,
            sentAt: log.sentAt,
            completedAt: log.completedAt,
            recipients: log.recipients
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching email log' });
    }
});

// Check for recent sends to prevent duplicates
// GET /api/email/check-duplicate/:classId/:studentId
router.get('/check-duplicate/:classId/:studentId', auth, async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        
        // Check if email was sent in last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentLog = await EmailLog.findOne({
            class: classId,
            'recipients.student': studentId,
            sentAt: { $gte: oneDayAgo },
             teacher: req.user._id
        }).select('sentAt');
        
        if (recentLog) {
            return res.json({
                isDuplicate: true,
                lastSentAt: recentLog.sentAt,
                message: `Email already sent on ${recentLog.sentAt.toLocaleDateString()}`
            });
        }
        
        res.json({ isDuplicate: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error checking duplicate' });
    }
});

module.exports = router;
