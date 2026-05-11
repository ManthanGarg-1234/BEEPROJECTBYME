const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// Get audit logs (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { action, entityType, limit = 50, skip = 0 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments(filter);

    res.json({ success: true, data: logs, pagination: { total, limit, skip } });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

// Get audit logs for a specific entity
router.get('/entity/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await AuditLog.find({
      entityType,
      entityId,
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching entity logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

// Get audit logs for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is requesting their own logs or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const logs = await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

// Get critical actions (admin only)
router.get('/critical/events', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const logs = await AuditLog.find({
      severity: 'critical',
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching critical logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

module.exports = router;
