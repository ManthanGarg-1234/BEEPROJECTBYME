const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SuspiciousLog = require('../models/SuspiciousLog');
const Attendance = require('../models/Attendance');

// Get suspicious activities
router.get('/reports', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const logs = await SuspiciousLog.find()
      .populate('student', 'name email rollNumber')
      .populate('session', 'name date class')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching suspicious logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

// Get suspicious activities for a student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const logs = await SuspiciousLog.find({ student: studentId })
      .populate('session', 'name date')
      .sort({ createdAt: -1 });

    // Analyze patterns
    const patterns = {
      totalIncidents: logs.length,
      byReason: {},
      recent24h: 0,
      recent7d: 0,
      riskLevel: 'low',
    };

    const now = new Date();
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    logs.forEach((log) => {
      patterns.byReason[log.reason] = (patterns.byReason[log.reason] || 0) + 1;
      if (log.createdAt > day24h) patterns.recent24h += 1;
      if (log.createdAt > day7d) patterns.recent7d += 1;
    });

    // Calculate risk level
    if (patterns.totalIncidents > 5) patterns.riskLevel = 'high';
    else if (patterns.totalIncidents > 2) patterns.riskLevel = 'medium';

    res.json({ success: true, data: logs, patterns });
  } catch (error) {
    console.error('Error fetching student suspicious logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

// Detect multiple location scans pattern
router.post('/analyze-patterns', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Get all suspicious logs from last 24 hours
    const now = new Date();
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = await SuspiciousLog.find({
      createdAt: { $gte: day24h },
    }).populate('student', 'name email');

    // Analyze for patterns
    const suspiciousPatterns = {};

    recentLogs.forEach((log) => {
      if (!suspiciousPatterns[log.student._id]) {
        suspiciousPatterns[log.student._id] = {
          student: log.student,
          incidents: [],
          risk: 'low',
        };
      }
      suspiciousPatterns[log.student._id].incidents.push({
        reason: log.reason,
        time: log.createdAt,
      });
    });

    // Calculate risk
    Object.keys(suspiciousPatterns).forEach((key) => {
      const incidents = suspiciousPatterns[key].incidents.length;
      if (incidents >= 4) suspiciousPatterns[key].risk = 'critical';
      else if (incidents >= 2) suspiciousPatterns[key].risk = 'high';
      else suspiciousPatterns[key].risk = 'medium';
    });

    res.json({
      success: true,
      data: Object.values(suspiciousPatterns),
      period: '24 hours',
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({ success: false, message: 'Error analyzing patterns' });
  }
});

// Flag suspicious activity for review
router.post('/flag/:logId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { logId } = req.params;
    const { flagReason } = req.body;

    const log = await SuspiciousLog.findByIdAndUpdate(
      logId,
      { $set: { flagged: true, flagReason, flaggedBy: req.user.id, flaggedAt: new Date() } },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    res.json({ success: true, message: 'Activity flagged for review', data: log });
  } catch (error) {
    console.error('Error flagging activity:', error);
    res.status(500).json({ success: false, message: 'Error flagging activity' });
  }
});

module.exports = router;
