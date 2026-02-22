const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');
const User = require('../models/User');
const { sendWarningEmail } = require('./emailService');

/**
 * Calculate attendance percentage for a student in a class
 * Late does NOT count as present
 */
const calculateAttendancePercentage = async (studentId, classId) => {
    const sessions = await Session.find({ class: classId }).select('_id');
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
 */
const evaluateClassAttendance = async (classId) => {
    const classDoc = await Class.findById(classId).populate('students');
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

    const results = [];

    for (const student of classDoc.students) {
        const { percentage, totalSessions, presentCount } = await calculateAttendancePercentage(student._id, classId);
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
            const emailSent = await sendWarningEmail(student.email, student.name, {
                subject: classDoc.subject,
                percentage,
                warningLevel
            });

            if (emailSent) {
                await User.findByIdAndUpdate(student._id, { lastWarningSentAt: new Date() });
                result.emailSent = true;
            }
        }

        results.push(result);
    }

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
