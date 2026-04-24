/**
 * insightGenerator.js
 * Generates human-readable insights for teacher and student attendance analytics
 */

/**
 * Generate teacher insights based on class statistics and chart data
 * @param {Object} stats - Class statistics (totalStudents, avgAttendance, totalSessions, atRiskCount, etc.)
 * @param {Array} chartData - Historical attendance data
 * @returns {Array<string>} Array of insight strings
 */
export const generateTeacherInsights = (stats, chartData = []) => {
    const insights = [];
    
    if (!stats || !chartData) return insights;

    const { 
        totalStudents = 0, 
        avgAttendance = 0, 
        totalSessions = 0, 
        atRiskCount = 0, 
        bestGroup = null,
        worstGroup = null,
        lastSessionPct = 0,
        improvementTrend = 0 
    } = stats;

    // No sessions conducted yet
    if (totalSessions === 0) {
        insights.push("No sessions conducted yet. Start your first session to see analytics.");
        return insights;
    }

    // At-risk students insight
    if (atRiskCount > 0 && totalStudents > 0) {
        const atRiskPct = Math.round((atRiskCount / totalStudents) * 100);
        insights.push(`${atRiskCount} out of ${totalStudents} students (${atRiskPct}%) are below 75% attendance. Consider sending them a warning.`);
    }

    // Class average insight
    if (avgAttendance >= 85) {
        insights.push(`Your class is performing excellently with ${avgAttendance}% average attendance. Keep up the momentum!`);
    } else if (avgAttendance >= 75) {
        insights.push(`Class average stands at ${avgAttendance}%. You're maintaining a healthy attendance rate.`);
    } else if (avgAttendance >= 65) {
        insights.push(`Class average is ${avgAttendance}%. Consider implementing engagement strategies to boost attendance.`);
    } else {
        insights.push(`Class average is only ${avgAttendance}%. This requires immediate attention and intervention.`);
    }

    // Best performing group
    if (bestGroup) {
        insights.push(`🌟 Best performing group: ${bestGroup.name} with ${bestGroup.pct}% average attendance.`);
    }

    // Improvement trend
    if (improvementTrend > 0) {
        insights.push(`📈 Attendance improved by ${improvementTrend}% over the last 3 sessions.`);
    } else if (improvementTrend < 0) {
        insights.push(`📉 Attendance declined by ${Math.abs(improvementTrend)}% over the last 3 sessions. Monitor this trend.`);
    }

    // Latest session performance
    if (lastSessionPct >= 85) {
        insights.push(`✨ Today's session had ${lastSessionPct}% attendance — the highest this semester!`);
    } else if (lastSessionPct >= 75) {
        insights.push(`✅ Today's session had ${lastSessionPct}% attendance, which is solid.`);
    } else if (lastSessionPct >= 65) {
        insights.push(`⚠️ Today's session had ${lastSessionPct}% attendance. Some students are consistently missing.`);
    } else {
        insights.push(`🚨 Today's session had only ${lastSessionPct}% attendance. This is concerning.`);
    }

    return insights.slice(0, 4); // Limit to 4 insights for display
};

/**
 * Generate student insights based on personal attendance data
 * @param {Object} summary - Attendance summary (present, late, absent)
 * @param {number} total - Total sessions attended
 * @param {number} pct - Current attendance percentage
 * @param {Object} analytics - Advanced analytics data
 * @returns {Array<string>} Array of insight strings
 */
export const generateStudentInsights = (summary = {}, total = 0, pct = 0, analytics = {}) => {
    const insights = [];

    const { present = 0, late = 0, absent = 0 } = summary;
    const {
        currentStreak = 0,
        longestStreak = 0,
        trend = 'stable', // improving, stable, declining
        predictedEOT = 0,
        isAboveAverage = false,
        classAverage = 0,
        comparisonToClass = 0
    } = analytics;

    // No attendance data yet
    if (total === 0) {
        insights.push("You haven't attended any sessions yet. Your attendance journey starts now!");
        return insights;
    }

    // Overall attendance status insight
    if (pct >= 85) {
        insights.push(`🎉 Excellent! Your ${pct}% attendance is well above the 75% threshold. You're on track!`);
    } else if (pct >= 75) {
        insights.push(`✅ Good Standing — You're at ${pct}% attendance, safely above the 75% threshold.`);
    } else if (pct >= 65) {
        const needed = Math.ceil((0.75 * total - present - late) / (1 - 0.75));
        insights.push(`⚠️ At Risk — You're at ${pct}% attendance. You need ${needed} more Present sessions to reach 75%.`);
    } else {
        const needed = Math.ceil((0.75 * total - present - late) / (1 - 0.75));
        insights.push(`🚨 Critical — At ${pct}% attendance, you must attend ${needed} more sessions to recover to 75%.`);
    }

    // Streak insight
    if (currentStreak >= 5) {
        insights.push(`🔥 Amazing streak! You've been present in the last ${currentStreak} sessions. Keep it up!`);
    } else if (currentStreak >= 3) {
        insights.push(`✨ You have a ${currentStreak}-session attendance streak. Continue this momentum.`);
    }

    // Trend insight
    if (trend === 'improving') {
        insights.push(`📈 Your attendance trend is improving. Keep attending regularly!`);
    } else if (trend === 'declining') {
        insights.push(`📉 Warning: Your attendance trend is declining. Make sure to attend the upcoming sessions.`);
    }

    // Predicted end of term
    if (predictedEOT > 0) {
        if (predictedEOT >= 75) {
            insights.push(`🎯 At your current rate, you'll end the semester at ${predictedEOT}% attendance.`);
        } else {
            const sessionsNeeded = Math.ceil((0.75 * (total + 5) - (present + late)) / 0.75 - (present + late)); // rough estimate
            insights.push(`⚠️ Predicted end-of-semester attendance: ${predictedEOT}%. You need consistent attendance to improve.`);
        }
    }

    // Comparison to class average
    if (classAverage > 0) {
        if (isAboveAverage) {
            insights.push(`📊 You're performing ${comparisonToClass}% above the class average of ${classAverage}%.`);
        } else if (comparisonToClass < 0) {
            insights.push(`📊 You're performing ${Math.abs(comparisonToClass)}% below the class average of ${classAverage}%. Catch up!`);
        }
    }

    return insights.slice(0, 4); // Limit to 4 insights for display
};

/**
 * Helper: Calculate trend direction based on recent attendance
 * @param {Array} recentRecords - Last N attendance records
 * @returns {string} 'improving' | 'stable' | 'declining'
 */
export const calculateTrend = (recentRecords = []) => {
    if (recentRecords.length < 3) return 'stable';

    const last3 = recentRecords.slice(-3);
    const presentCount = last3.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const rate = presentCount / 3;

    if (rate >= 0.7) return 'improving';
    if (rate <= 0.3) return 'declining';
    return 'stable';
};

/**
 * Helper: Calculate streak of consecutive attendance
 * @param {Array} records - Sorted attendance records
 * @returns {number} Current streak length
 */
export const calculateCurrentStreak = (records = []) => {
    if (records.length === 0) return 0;

    let streak = 0;
    for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].status === 'Present' || records[i].status === 'Late') {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};

export default {
    generateTeacherInsights,
    generateStudentInsights,
    calculateTrend,
    calculateCurrentStreak,
};
