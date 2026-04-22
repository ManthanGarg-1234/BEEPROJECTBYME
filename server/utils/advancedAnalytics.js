const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');

/**
 * TREND ANALYSIS
 * Calculates attendance trends, moving averages, and growth rates
 */
const calculateTrendAnalysis = (attendanceHistory) => {
    if (!attendanceHistory || attendanceHistory.length === 0) {
        return {
            movingAverage7d: 0,
            trendDirection: 'stable',
            trendStrength: 0,
            growthRate: 0,
            consistency: 0
        };
    }

    // Moving average (last 7 days)
    const recentDays = attendanceHistory.slice(-7);
    const movingAverage7d = recentDays.length > 0
        ? Math.round((recentDays.reduce((a, b) => a + b, 0) / recentDays.length) * 100) / 100
        : 0;

    // Trend direction and strength (linear regression)
    const x = recentDays.map((_, i) => i);
    const y = recentDays;
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trendDirection = slope > 2 ? 'improving' : slope < -2 ? 'declining' : 'stable';
    const trendStrength = Math.min(Math.abs(slope) / 10, 1); // Normalize to 0-1

    // Growth rate (first day vs last day)
    const growthRate = recentDays.length > 1
        ? Math.round(((recentDays[recentDays.length - 1] - recentDays[0]) / recentDays[0]) * 1000) / 10
        : 0;

    // Consistency score (low std dev = high consistency)
    const mean = sumY / n;
    const variance = y.reduce((a, val) => a + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev * 10);

    return {
        movingAverage7d,
        trendDirection,
        trendStrength: Math.round(trendStrength * 100),
        growthRate,
        consistency: Math.round(consistency)
    };
};

/**
 * PERFORMANCE METRICS
 * Calculates streaks, performance scores, and improvement tracking
 */
const calculatePerformanceMetrics = async (studentId, classId, sessions) => {
    const sessionIds = sessions.map(s => s._id);

    // Get attendance records
    const attendanceRecords = await Attendance.find({
        student: studentId,
        session: { $in: sessionIds },
        class: classId
    }).select('session status').sort({ 'session.startTime': 1 }).lean();

    // Create status map for each session
    const sessionStatusMap = {};
    attendanceRecords.forEach(rec => {
        sessionStatusMap[rec.session.toString()] = rec.status;
    });

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let totalPresent = 0;
    let attendanceHistory = [];

    for (const session of sessions) {
        const status = sessionStatusMap[session._id.toString()] || 'Absent';
        const isPresent = (status === 'Present' || status === 'Late');

        if (isPresent) {
            currentStreak++;
            totalPresent++;
        } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 0;
        }

        // Track daily attendance percentage (cumulative)
        const dayPercentage = (totalPresent / (attendanceHistory.length + 1)) * 100;
        attendanceHistory.push(Math.round(dayPercentage * 100) / 100);
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    const totalSessions = sessions.length;
    const currentPercentage = totalSessions > 0
        ? Math.round((totalPresent / totalSessions) * 10000) / 100
        : 0;

    // Performance score (0-100)
    const percentageScore = Math.min(currentPercentage / 0.75, 100); // 75% = 100 points
    const streakScore = Math.min(currentStreak / (totalSessions * 0.5) * 100, 100); // Score based on streak vs expected
    const consistencyScore = calculateTrendAnalysis(attendanceHistory).consistency;
    const performanceScore = Math.round((percentageScore * 0.5 + streakScore * 0.3 + consistencyScore * 0.2));

    return {
        currentStreak,
        longestStreak,
        performanceScore,
        percentage: currentPercentage,
        totalPresent,
        totalSessions,
        attendanceHistory,
        milestones: {
            '10SessionStreak': currentStreak >= 10,
            '100PercentMonth': false, // Would need month-based calculation
            'NoMissedDay': currentStreak === totalSessions,
            'GoodStanding': currentPercentage >= 75
        }
    };
};

/**
 * COMPARATIVE ANALYTICS
 * Compares individual student to class averages and benchmarks
 */
const calculateComparativeAnalytics = async (studentId, classId, sessions) => {
    const sessionIds = sessions.map(s => s._id);

    // Get this student's attendance
    const studentAttendance = await Attendance.countDocuments({
        student: studentId,
        session: { $in: sessionIds },
        status: { $in: ['Present', 'Late'] }
    });

    // Get all class attendance
    const classAttendanceAgg = await Attendance.aggregate([
        { $match: { session: { $in: sessionIds }, class: classId } },
        { $group: { _id: '$student', count: { $sum: 1 } } }
    ]);

    const totalStudents = classAttendanceAgg.length;
    const studentPercentages = classAttendanceAgg.map(a => (a.count / sessionIds.length) * 100);
    const avgClassAttendance = studentPercentages.reduce((a, b) => a + b, 0) / totalStudents;

    const studentPercentage = (studentAttendance / sessionIds.length) * 100;

    // Percentile ranking
    const studentsAbove = studentPercentages.filter(p => p > studentPercentage).length;
    const percentileRank = ((totalStudents - studentsAbove) / totalStudents) * 100;

    // Comparison to class
    const comparisonToClass = Math.round((studentPercentage - avgClassAttendance) * 100) / 100;

    return {
        studentPercentage: Math.round(studentPercentage * 100) / 100,
        classAverage: Math.round(avgClassAttendance * 100) / 100,
        comparisonToClass,
        percentileRank: Math.round(percentileRank),
        ranking: totalStudents - studentsAbove, // Rank out of total students
        totalStudentsInClass: totalStudents,
        isAboveAverage: studentPercentage > avgClassAttendance
    };
};

/**
 * RISK ASSESSMENT
 * Evaluates attendance risk and predicts future attendance
 */
const calculateRiskAssessment = async (studentId, classId, sessions) => {
    const sessionIds = sessions.map(s => s._id);

    // Get recent attendance (last 2 weeks or available)
    const recentSessionIds = sessionIds.slice(-10);
    const recentAttendance = await Attendance.countDocuments({
        student: studentId,
        session: { $in: recentSessionIds },
        status: { $in: ['Present', 'Late'] }
    });

    const recentPercentage = (recentAttendance / recentSessionIds.length) * 100;

    // Get older attendance (sessions before recent)
    const olderSessionIds = sessionIds.slice(0, -10);
    let olderPercentage = 100;
    if (olderSessionIds.length > 0) {
        const olderAttendance = await Attendance.countDocuments({
            student: studentId,
            session: { $in: olderSessionIds },
            status: { $in: ['Present', 'Late'] }
        });
        olderPercentage = (olderAttendance / olderSessionIds.length) * 100;
    }

    // Attendance drop detection
    const attendanceDrop = olderPercentage - recentPercentage;
    const isDropping = attendanceDrop > 10; // 10% drop is significant

    // Risk level
    let riskLevel = 'low';
    let riskScore = 0;

    if (recentPercentage < 65) {
        riskLevel = 'critical';
        riskScore = 90;
    } else if (recentPercentage < 75) {
        riskLevel = 'high';
        riskScore = 70;
    } else if (recentPercentage < 85) {
        riskLevel = 'medium';
        riskScore = 40;
    } else {
        riskLevel = 'low';
        riskScore = 10;
    }

    // Boost risk score if dropping
    if (isDropping) {
        riskScore = Math.min(riskScore + 20, 100);
    }

    // Predict attendance if trend continues
    const remainingSessions = Math.max(30 - sessionIds.length, 5);
    const currentTotal = sessionIds.length;
    const currentPresent = Math.round((recentPercentage / 100) * currentTotal);
    const predictedPresent = currentPresent + Math.round((recentPercentage / 100) * remainingSessions);
    const predictedPercentage = (predictedPresent / (currentTotal + remainingSessions)) * 100;

    return {
        riskLevel,
        riskScore,
        recentPercentage: Math.round(recentPercentage * 100) / 100,
        attendanceDrop: Math.round(attendanceDrop * 100) / 100,
        isDropping,
        predictedEndOfSemesterPercentage: Math.round(predictedPercentage * 100) / 100,
        predictedPresent: predictedPresent,
        remainingSessionsEstimate: remainingSessions
    };
};

/**
 * TEMPORAL ANALYSIS
 * Analyzes patterns by day of week, time of day, monthly trends
 */
const calculateTemporalAnalysis = async (studentId, classId) => {
    // Get all attendance with session details
    const attendanceWithSessions = await Attendance.aggregate([
        { $match: { student: studentId, class: classId } },
        {
            $lookup: {
                from: 'sessions',
                localField: 'session',
                foreignField: '_id',
                as: 'sessionData'
            }
        },
        { $unwind: '$sessionData' }
    ]);

    // Analyze by day of week
    const dayOfWeekStats = {
        Monday: { present: 0, total: 0 },
        Tuesday: { present: 0, total: 0 },
        Wednesday: { present: 0, total: 0 },
        Thursday: { present: 0, total: 0 },
        Friday: { present: 0, total: 0 },
        Saturday: { present: 0, total: 0 },
        Sunday: { present: 0, total: 0 }
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Analyze by month
    const monthlyStats = {};

    for (const rec of attendanceWithSessions) {
        const sessionDate = new Date(rec.sessionData.startTime);
        const dayName = dayNames[sessionDate.getDay()];
        const month = sessionDate.toISOString().split('T')[0].substring(0, 7); // YYYY-MM

        // Day of week stats
        dayOfWeekStats[dayName].total++;
        if (rec.status === 'Present' || rec.status === 'Late') {
            dayOfWeekStats[dayName].present++;
        }

        // Monthly stats
        if (!monthlyStats[month]) {
            monthlyStats[month] = { present: 0, total: 0 };
        }
        monthlyStats[month].total++;
        if (rec.status === 'Present' || rec.status === 'Late') {
            monthlyStats[month].present++;
        }
    }

    // Calculate percentages
    const dayOfWeekPercentages = {};
    for (const [day, stats] of Object.entries(dayOfWeekStats)) {
        dayOfWeekPercentages[day] = stats.total > 0
            ? Math.round((stats.present / stats.total) * 100)
            : 0;
    }

    const monthlyPercentages = {};
    for (const [month, stats] of Object.entries(monthlyStats)) {
        monthlyPercentages[month] = stats.total > 0
            ? Math.round((stats.present / stats.total) * 100)
            : 0;
    }

    // Find best and worst days
    const dayEntries = Object.entries(dayOfWeekPercentages);
    const bestDay = dayEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const worstDay = dayEntries.reduce((a, b) => a[1] < b[1] ? a : b)[0];

    return {
        dayOfWeekStats: dayOfWeekPercentages,
        monthlyStats: monthlyPercentages,
        bestDay,
        worstDay,
        consistencyByDay: Object.values(dayOfWeekPercentages).every(v => v > 75)
    };
};

/**
 * COMPREHENSIVE STUDENT ANALYTICS
 * Combines all analytics into one call for efficiency
 */
const getComprehensiveStudentAnalytics = async (studentId, classId) => {
    try {
        const classDoc = await Class.findById(classId).lean();
        if (!classDoc) return { error: 'Class not found' };

        // Get all sessions
        const sessions = await Session.find({ class: classId }).sort({ startTime: 1 }).lean();
        if (sessions.length === 0) {
            return { error: 'No sessions found', classId };
        }

        // Execute all analytics in parallel
        const [
            performance,
            comparative,
            risk,
            temporal,
            trend
        ] = await Promise.all([
            calculatePerformanceMetrics(studentId, classId, sessions),
            calculateComparativeAnalytics(studentId, classId, sessions),
            calculateRiskAssessment(studentId, classId, sessions),
            calculateTemporalAnalysis(studentId, classId),
            calculateTrendAnalysis(
                (await calculatePerformanceMetrics(studentId, classId, sessions)).attendanceHistory
            )
        ]);

        return {
            performance,
            comparative,
            risk,
            temporal,
            trend,
            summary: {
                overallScore: performance.performanceScore,
                riskLevel: risk.riskLevel,
                trendDirection: trend.trendDirection,
                recommendation: generateRecommendation(performance, risk, trend)
            }
        };
    } catch (error) {
        console.error('Comprehensive analytics error:', error);
        throw error;
    }
};

/**
 * CLASS-LEVEL INSIGHTS
 * Aggregated analytics for the entire class
 */
const getClassInsights = async (classId) => {
    try {
        const classDoc = await Class.findById(classId).populate('students', '_id').lean();
        if (!classDoc) return { error: 'Class not found' };

        const sessions = await Session.find({ class: classId }).sort({ startTime: 1 }).lean();
        if (sessions.length === 0) {
            return { error: 'No sessions found', classId };
        }

        const sessionIds = sessions.map(s => s._id);
        const studentIds = classDoc.students.map(s => s._id);

        // Aggregate all attendance for the class
        const attendanceAgg = await Attendance.aggregate([
            { $match: { class: classId, session: { $in: sessionIds } } },
            {
                $group: {
                    _id: '$student',
                    presentCount: {
                        $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] }
                    },
                    totalRecords: { $sum: 1 }
                }
            }
        ]);

        // Calculate class statistics
        const studentStats = studentIds.map(sid => {
            const rec = attendanceAgg.find(a => a._id.toString() === sid.toString());
            return rec ? (rec.presentCount / sessionIds.length) * 100 : 0;
        });

        const avgAttendance = studentStats.reduce((a, b) => a + b, 0) / studentStats.length;
        const attendanceStdDev = Math.sqrt(
            studentStats.reduce((a, p) => a + Math.pow(p - avgAttendance, 2), 0) / studentStats.length
        );

        // Risk distribution
        const riskDistribution = {
            critical: studentStats.filter(p => p < 65).length,
            high: studentStats.filter(p => p >= 65 && p < 75).length,
            medium: studentStats.filter(p => p >= 75 && p < 85).length,
            low: studentStats.filter(p => p >= 85).length
        };

        return {
            totalStudents: studentIds.length,
            totalSessions: sessionIds.length,
            avgAttendance: Math.round(avgAttendance * 100) / 100,
            minAttendance: Math.round(Math.min(...studentStats) * 100) / 100,
            maxAttendance: Math.round(Math.max(...studentStats) * 100) / 100,
            standardDeviation: Math.round(attendanceStdDev * 100) / 100,
            riskDistribution,
            healthScore: Math.round(Math.max(0, avgAttendance - 50) / 50 * 100) // 50-100% -> 0-100 score
        };
    } catch (error) {
        console.error('Class insights error:', error);
        throw error;
    }
};

/**
 * GENERATE RECOMMENDATIONS
 * AI-like recommendations based on analytics
 */
const generateRecommendation = (performance, risk, trend) => {
    const recommendations = [];

    // Performance-based
    if (performance.performanceScore > 80) {
        recommendations.push('🌟 Excellent performance! Keep up the great work.');
    } else if (performance.performanceScore > 60) {
        recommendations.push('✅ Good progress. Continue maintaining your attendance.');
    } else {
        recommendations.push('⚠️ Your attendance needs improvement.');
    }

    // Risk-based
    if (risk.riskLevel === 'critical') {
        recommendations.push('🚨 URGENT: Your attendance is critically low. Contact your teacher immediately.');
    } else if (risk.isDropping) {
        recommendations.push('📉 Your attendance is declining. Address this before it becomes critical.');
    }

    // Trend-based
    if (trend.trendDirection === 'improving') {
        recommendations.push('📈 Your attendance trend is improving! Keep this up.');
    } else if (trend.trendDirection === 'declining') {
        recommendations.push('📉 Your recent attendance trend is declining.');
    }

    // Streak-based
    if (performance.currentStreak > 5) {
        recommendations.push(`🔥 You have a ${performance.currentStreak}-day streak! Great commitment!`);
    }

    return recommendations.length > 0 ? recommendations : ['📊 Keep monitoring your attendance.'];
};

module.exports = {
    calculateTrendAnalysis,
    calculatePerformanceMetrics,
    calculateComparativeAnalytics,
    calculateRiskAssessment,
    calculateTemporalAnalysis,
    getComprehensiveStudentAnalytics,
    getClassInsights,
    generateRecommendation
};
