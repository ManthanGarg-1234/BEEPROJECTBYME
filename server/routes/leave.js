const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Leave = require('../models/Leave');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');

// Get all leave requests for a student
router.get('/my-leaves', auth, authorize('student'), async (req, res) => {
  try {
    const leaves = await Leave.find({ student: req.user._id })
      .populate('class', 'classId subject teacher')
      .populate('teacher', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaves' });
  }
});

// Get leave requests for a class (teacher only)
router.get('/class/:classId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Verify teacher owns this class
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const leaves = await Leave.find({ class: classId })
      .populate('student', 'name email rollNumber')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Error fetching class leaves:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaves' });
  }
});

// Submit leave request (student)
router.post('/request', auth, authorize('student'), async (req, res) => {
  try {
    const { classId, leaveType, reason, startDate, endDate } = req.body;

    // Validate required fields
    if (!classId || !leaveType || !reason || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: classId, leaveType, reason, startDate, endDate' 
      });
    }

    // Verify student is enrolled in this class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isEnrolled = classDoc.students.some(s => s.toString() === req.user._id.toString());
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'Student not enrolled in this class' });
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      student: req.user._id,
      class: classId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(endDate), $gte: new Date(startDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({ 
        success: false, 
        message: 'Leave request overlaps with existing leave' 
      });
    }

    const leave = new Leave({
      student: req.user._id,
      class: classId,
      leaveType,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    await leave.save();
    await leave.populate('class', 'classId subject');

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entityType: 'Leave',
      entityId: leave._id,
      entityDetails: {
        name: `Leave Request: ${leaveType}`,
        description: `${leave.numberOfDays} days leave starting ${leave.startDate.toLocaleDateString()}`
      },
      newValues: leave.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.status(201).json({ 
      success: true, 
      message: 'Leave request submitted successfully', 
      data: leave 
    });
  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(500).json({ success: false, message: error.message || 'Error submitting leave request' });
  }
});

// Approve leave request (teacher only)
router.put('/approve/:leaveId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvalNotes } = req.body;

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Verify teacher owns the class
    const classDoc = await Class.findById(leave.class);
    if (classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const oldValues = leave.toObject();
    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvalNotes = approvalNotes || '';
    leave.approvalDate = new Date();

    await leave.save();
    await leave.populate('student', 'name email');

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'APPROVE_LEAVE',
      entityType: 'Leave',
      entityId: leave._id,
      oldValues: { status: oldValues.status },
      newValues: { status: leave.status, approvalNotes },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
    });

    res.json({ 
      success: true, 
      message: 'Leave approved successfully', 
      data: leave 
    });
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({ success: false, message: error.message || 'Error approving leave' });
  }
});

// Reject leave request (teacher only)
router.put('/reject/:leaveId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvalNotes } = req.body;

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Verify teacher owns the class
    const classDoc = await Class.findById(leave.class);
    if (classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const oldValues = leave.toObject();
    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvalNotes = approvalNotes || '';
    leave.approvalDate = new Date();

    await leave.save();
    await leave.populate('student', 'name email');

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'APPROVE_LEAVE',
      entityType: 'Leave',
      entityId: leave._id,
      oldValues: { status: oldValues.status },
      newValues: { status: leave.status, approvalNotes },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.json({ 
      success: true, 
      message: 'Leave rejected', 
      data: leave 
    });
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ success: false, message: error.message || 'Error rejecting leave' });
  }
});

// Get leave balance for a student
router.get('/balance/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Users can only check their own balance unless they're admin
    if (req.user._id.toString() !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const approvedLeaves = await Leave.find({
      student: studentId,
      status: { $in: ['approved', 'pending'] },
      endDate: { $gte: new Date(new Date().getFullYear(), 0, 1) } // Current academic year
    });

    const totalDays = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
    const maxLeaves = 30; // Configurable per institution
    const balance = Math.max(0, maxLeaves - totalDays);

    res.json({ 
      success: true, 
      data: { 
        totalUsed: totalDays, 
        balance, 
        maxAllowed: maxLeaves,
        academicYear: new Date().getFullYear()
      } 
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching leave balance' });
  }
});

// Get leave statistics for a class (teacher only)
router.get('/stats/:classId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns this class
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const stats = await Leave.aggregate([
      { $match: { class: require('mongoose').Types.ObjectId(classId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      }
    ]);

    const statsObj = {
      pending: { count: 0, totalDays: 0 },
      approved: { count: 0, totalDays: 0 },
      rejected: { count: 0, totalDays: 0 }
    };

    stats.forEach(s => {
      statsObj[s._id] = { count: s.count, totalDays: s.totalDays };
    });

    res.json({ success: true, data: statsObj });
  } catch (error) {
    console.error('Error fetching leave stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching statistics' });
  }
});

module.exports = router;
