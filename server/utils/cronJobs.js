const cron = require('node-cron');
const Class = require('../models/Class');
const { evaluateClassAttendance } = require('./evaluationEngine');
const nodemailer = require('nodemailer');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');

// Initialize SMTP transporter for emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Initialize cron jobs
 */
const initCronJobs = () => {
    // Weekly attendance evaluation cron
    cron.schedule('0 9 * * 0', async () => {
        console.log('[CRON] Running weekly attendance evaluation...');
        try {
            const classes = await Class.find({});

            for (const cls of classes) {
                try {
                    const result = await evaluateClassAttendance(cls._id);
                    if (result.skipped) {
                        console.log(`[CRON] Skipped ${cls.classId}: ${result.message}`);
                    } else {
                        const warned = result.results.filter(r => r.warningLevel).length;
                        const emailed = result.results.filter(r => r.emailSent).length;
                        console.log(`[CRON] ${cls.classId}: ${warned} warnings, ${emailed} emails sent`);
                    }
                } catch (err) {
                    console.error(`[CRON] Error evaluating ${cls.classId}:`, err.message);
                }
            }

            console.log('[CRON] Weekly evaluation complete.');
        } catch (error) {
            console.error('[CRON] Fatal cron error:', error.message);
        }
    });

    // Auto-terminate expired sessions: every minute
    cron.schedule('* * * * *', async () => {
        try {
            const Session = require('../models/Session');
            const now = new Date();
            const gracePeriod = 2 * 60 * 60 * 1000; // 2 hours after attendance window
            const expired = await Session.updateMany(
                { isActive: true, attendanceWindowEnd: { $lte: new Date(now.getTime() - gracePeriod) } },
                { isActive: false, endTime: now }
            );
            if (expired.modifiedCount > 0) {
                console.log(`[CRON] Auto-terminated ${expired.modifiedCount} expired session(s)`);
            }
        } catch (error) {
            console.error('[CRON] Session cleanup error:', error.message);
        }
    });

    // Daily attendance summary: Every day at 5:00 PM
    cron.schedule('0 17 * * *', async () => {
        console.log('[CRON] Generating daily attendance summary...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const User = require('../models/User');
            const teachers = await User.find({ role: 'teacher' });

            for (const teacher of teachers) {
                try {
                    const classes = await Class.find({ teacher: teacher._id });
                    let totalStudents = 0;
                    let presentStudents = 0;
                    let totalClasses = 0;

                    for (const cls of classes) {
                        const attendance = await Attendance.find({
                            class: cls._id,
                            createdAt: { $gte: yesterday, $lt: today },
                            present: true,
                        });
                        const total = await Attendance.countDocuments({
                            class: cls._id,
                            createdAt: { $gte: yesterday, $lt: today },
                        });
                        totalStudents += total;
                        presentStudents += attendance.length;
                        totalClasses += 1;
                    }

                    if (totalClasses > 0) {
                        const summaryText = `
                            Daily Attendance Summary - ${yesterday.toLocaleDateString()}
                            
                            Total Classes: ${totalClasses}
                            Total Students Marked: ${totalStudents}
                            Students Present: ${presentStudents}
                            Attendance Rate: ${((presentStudents / totalStudents) * 100 || 0).toFixed(2)}%
                        `;

                        if (process.env.SMTP_USER) {
                            await transporter.sendMail({
                                from: process.env.SMTP_USER,
                                to: teacher.email,
                                subject: `Daily Attendance Report - ${yesterday.toLocaleDateString()}`,
                                text: summaryText,
                            });
                        }
                    }
                } catch (err) {
                    console.error(`[CRON] Error sending report to ${teacher.email}:`, err.message);
                }
            }

            console.log('[CRON] Daily attendance summary complete.');
        } catch (error) {
            console.error('[CRON] Daily summary error:', error.message);
        }
    });

    // Weekly performance report: Every Monday at 8:00 AM
    cron.schedule('0 8 * * 1', async () => {
        console.log('[CRON] Generating weekly performance report...');
        try {
            const User = require('../models/User');
            const teachers = await User.find({ role: 'teacher' });

            for (const teacher of teachers) {
                try {
                    const classes = await Class.find({ teacher: teacher._id });
                    let classStats = [];

                    for (const cls of classes) {
                        const avgMarks = await Marks.aggregate([
                            { $match: { class: cls._id } },
                            { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } },
                        ]);

                        const attendance = await Attendance.aggregate([
                            { $match: { class: cls._id } },
                            { $group: { _id: null, avgAttendance: { $avg: { $cond: ['$present', 100, 0] } } } },
                        ]);

                        classStats.push({
                            className: cls.name,
                            avgMarks: avgMarks[0]?.avgPercentage || 0,
                            avgAttendance: attendance[0]?.avgAttendance || 0,
                        });
                    }

                    const reportText = `
                        Weekly Performance Report
                        ${new Date().toLocaleDateString()}
                        
                        ${classStats.map((stat) => `
                            Class: ${stat.className}
                            Avg Marks: ${stat.avgMarks.toFixed(2)}%
                            Avg Attendance: ${stat.avgAttendance.toFixed(2)}%
                        `).join('\n')}
                    `;

                    if (process.env.SMTP_USER) {
                        await transporter.sendMail({
                            from: process.env.SMTP_USER,
                            to: teacher.email,
                            subject: 'Weekly Performance Report',
                            text: reportText,
                        });
                    }
                } catch (err) {
                    console.error(`[CRON] Error sending weekly report to ${teacher.email}:`, err.message);
                }
            }

            console.log('[CRON] Weekly performance report complete.');
        } catch (error) {
            console.error('[CRON] Weekly report error:', error.message);
        }
    });

    console.log('[CRON] Cron jobs initialized');
};

module.exports = { initCronJobs };
