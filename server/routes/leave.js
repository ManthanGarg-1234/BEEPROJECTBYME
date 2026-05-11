const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');
const Leave = require('../models/Leave');
const AuditLog = require('../models/AuditLog');

// Get all leave requests for a student
router.get('/my-leaves', auth, async (req, res) => {
  try {
    const leaves = await Leave.find({ studentId: req.user.id })
      .populate('classId', 'name')
      .populate('sessionId', 'name date')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaves' });
  }
});

// Get leave requests for a class (teacher only)
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const leaves = await Leave.find({ classId })
      .populate('studentId', 'name email rollNumber')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching class leaves:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaves' });
  }
});

// Submit leave request (student)
router.post('/request', auth, async (req, res) => {
  try {
    const { classId, sessionId, reason, startDate, endDate } = req.body;

    if (!classId || !sessionId || !reason || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const leave = new Leave({
      studentId: req.user.id,
      classId,
      sessionId,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    await leave.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'Leave',
      entityId: leave._id,
      newValues: leave.toObject(),
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(201).json({ success: true, message: 'Leave request submitted', data: leave });
  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(500).json({ success: false, message: 'Error submitting leave request' });
  }
});

// Approve leave request (teacher)
router.put('/approve/:leaveId', auth, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvalNotes } = req.body;

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const oldValues = leave.toObject();
    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approvalNotes = approvalNotes || '';
    leave.approvalDate = new Date();

    await leave.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      action: 'APPROVE_LEAVE',
      entityType: 'Leave',
      entityId: leave._id,
      oldValues,
      newValues: leave.toObject(),
      ipAddress: req.ip,
      severity: 'warning',
    });

    res.json({ success: true, message: 'Leave approved', data: leave });
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({ success: false, message: 'Error approving leave' });
  }
});

// Reject leave request (teacher)
router.put('/reject/:leaveId', auth, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvalNotes } = req.body;

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const oldValues = leave.toObject();
    leave.status = 'rejected';
    leave.approvedBy = req.user.id;
    leave.approvalNotes = approvalNotes || '';
    leave.approvalDate = new Date();

    await leave.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      action: 'APPROVE_LEAVE',
      entityType: 'Leave',
      entityId: leave._id,
      oldValues,
      newValues: leave.toObject(),
      ipAddress: req.ip,
      severity: 'info',
    });

    res.json({ success: true, message: 'Leave rejected', data: leave });
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ success: false, message: 'Error rejecting leave' });
  }
});

// Get leave balance for a student
router.get('/balance/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const approvedLeaves = await Leave.find({
      studentId,
      status: 'approved',
    });

    const totalDays = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
    const maxLeaves = 30; // Configurable
    const balance = Math.max(0, maxLeaves - totalDays);

    res.json({ success: true, data: { totalUsed: totalDays, balance, maxAllowed: maxLeaves } });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ success: false, message: 'Error fetching leave balance' });
  }
});

module.exports = router;
