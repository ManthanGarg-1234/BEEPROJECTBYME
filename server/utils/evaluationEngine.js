const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');
const User = require('../models/User');
const { sendWarningEmail } = require('./emailService');

/**
 * Calculate attendance percentage for a single student in a class
 * (Used for individual lookups only — bulk evaluation uses evaluateClassAttendance which aggregates)
 */
const calculateAttendancePercentage = async (studentId, classId) => {
    const sessions = await Session.find({ class: classId }).select('_id').lean();
    const totalSessions = sessions.length;

    if (totalSessions === 0) return { percentage: 100, totalSessions: 0, presentCount: 0 };

    const sessionIds = sessions.map(s => s._id);
    const presentCount = await Attendance.countDocuments({
        student: studentId,
        session: { $in: sessionIds },
        status: 'Present'
    });

    const percentage = (presentCount / totalSessions) * 100;
    return {
        percentage: Math.round(percentage * 100) / 100,
        totalSessions,
        presentCount
    };
};

/**
 * Get warning level based on attendance percentage
 */
const getWarningLevel = (percentage) => {
    if (percentage < 65) return 'Critical';
    if (percentage < 75) return 'Warning';
    return null;
};

/**
 * Check if email cooldown has passed (10 days)
 */
const isEmailCooldownPassed = (lastWarningSentAt) => {
    if (!lastWarningSentAt) return true;
    const cooldownMs = 10 * 24 * 60 * 60 * 1000; // 10 days
    return (Date.now() - new Date(lastWarningSentAt).getTime()) >= cooldownMs;
};

/**
 * Evaluate attendance for all students in a class
 * Uses a single aggregation instead of N sequential queries — O(1) DB calls
 */
const evaluateClassAttendance = async (classId) => {
    const classDoc = await Class.findById(classId).populate('students', 'name email rollNumber lastWarningSentAt');
    if (!classDoc) return { error: 'Class not found' };

    // Check semester progress >= 40%
    const semesterProgress = classDoc.semesterProgress;
    if (semesterProgress < 40) {
        return {
            skipped: true,
            message: `Semester progress is ${semesterProgress}%. Evaluation activates after 40%.`,
            semesterProgress
        };
    }

    // 1 query: all sessions for this class
    const sessions = await Session.find({ class: classId }).select('_id').lean();
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
        return {
            classId: classDoc.classId,
            subject: classDoc.subject,
            semesterProgress,
            totalStudents: classDoc.students.length,
            results: classDoc.students.map(s => ({
                studentId: s._id, name: s.name, email: s.email,
                rollNumber: s.rollNumber, percentage: 100, totalSessions: 0,
                presentCount: 0, warningLevel: null, emailSent: false
            }))
        };
    }

    const sessionIds = sessions.map(s => s._id);

    // 1 aggregation: count Present per student across all sessions
    const attAgg = await Attendance.aggregate([
        { $match: { session: { $in: sessionIds }, class: classDoc._id, status: 'Present' } },
        { $group: { _id: '$student', presentCount: { $sum: 1 } } }
    ]);

    // Build map: studentId -> presentCount
    const presentMap = {};
    for (const { _id, presentCount } of attAgg) {
        presentMap[_id.toString()] = presentCount;
    }

    const results = [];
    const emailPromises = [];

    for (const student of classDoc.students) {
        const presentCount = presentMap[student._id.toString()] || 0;
        const percentage = Math.round((presentCount / totalSessions) * 10000) / 100;
        const warningLevel = getWarningLevel(percentage);

        const result = {
            studentId: student._id,
            name: student.name,
            email: student.email,
            rollNumber: student.rollNumber,
            percentage,
            totalSessions,
            presentCount,
            warningLevel,
            emailSent: false
        };

        if (warningLevel && isEmailCooldownPassed(student.lastWarningSentAt)) {
            // Fire-and-forget email sending (non-blocking)
            emailPromises.push(
                sendWarningEmail(student.email, student.name, {
                    subject: classDoc.subject,
                    percentage,
                    warningLevel
                }).then(sent => {
                    if (sent) {
                        result.emailSent = true;
                        return User.findByIdAndUpdate(student._id, { lastWarningSentAt: new Date() });
                    }
                }).catch(err => console.error(`Warning email failed for ${student.email}:`, err.message))
            );
        }

        results.push(result);
    }

    // Wait for all emails to finish
    await Promise.all(emailPromises);

    return {
        classId: classDoc.classId,
        subject: classDoc.subject,
        semesterProgress,
        totalStudents: classDoc.students.length,
        results
    };
};

module.exports = {
    calculateAttendancePercentage,
    getWarningLevel,
    isEmailCooldownPassed,
    evaluateClassAttendance
};

