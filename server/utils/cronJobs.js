const cron = require('node-cron');
const Class = require('../models/Class');
const { evaluateClassAttendance } = require('./evaluationEngine');

/**
 * Initialize cron jobs
 * Weekly evaluation: Every Sunday at 9:00 AM
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
            const expired = await Session.updateMany(
                { isActive: true, endTime: { $lte: now } },
                { isActive: false }
            );
            if (expired.modifiedCount > 0) {
                console.log(`[CRON] Auto-terminated ${expired.modifiedCount} expired session(s)`);
            }
        } catch (error) {
            console.error('[CRON] Session cleanup error:', error.message);
        }
    });

    console.log('[CRON] Cron jobs initialized');
};

module.exports = { initCronJobs };
