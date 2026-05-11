const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// Get audit logs (admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { action, entityType, severity, limit = 50, skip = 0, dateFrom, dateTo } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (severity) filter.severity = severity;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments(filter);

    res.json({ 
      success: true, 
      data: logs, 
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } 
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching logs' });
  }
});

// Get audit logs for a specific entity
router.get('/entity/:entityType/:entityId', auth, authorize('admin'), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await AuditLog.find({
      entityType,
      entityId: require('mongoose').Types.ObjectId(entityId),
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching entity logs:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching logs' });
  }
});

// Get audit logs for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is requesting their own logs or is admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const logs = await AuditLog.find({ user: userId })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching logs' });
  }
});

// Get critical actions (admin only)
router.get('/critical/events', auth, authorize('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({
      severity: 'critical',
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching critical logs:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching logs' });
  }
});

// Get audit log summary statistics (admin only)
router.get('/summary/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const severityStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ 
      success: true, 
      data: {
        actionStats: stats,
        severityStats: severityStats,
        totalLogs: await AuditLog.countDocuments()
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching statistics' });
  }
});

module.exports = router;
