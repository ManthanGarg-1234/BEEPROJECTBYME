const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');

// Submit feedback
router.post('/submit', auth, async (req, res) => {
  try {
    const { classId, sessionId, rating, category, comment, isAnonymous } = req.body;

    if (!rating || !category) {
      return res.status(400).json({ success: false, message: 'Rating and category are required' });
    }

    const feedback = new Feedback({
      studentId: isAnonymous ? null : req.user.id,
      classId,
      sessionId,
      rating,
      category,
      comment: comment || null,
      isAnonymous: isAnonymous || false,
    });

    await feedback.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'Feedback',
      entityId: feedback._id,
      newValues: feedback.toObject(),
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(201).json({ success: true, message: 'Feedback submitted', data: feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Error submitting feedback' });
  }
});

// Get feedback for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const feedback = await Feedback.find({
      classId,
      status: 'active',
    })
      .populate('studentId', 'name -_id')
      .select('-studentId -isAnonymous')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const total = feedback.length;
    const avgRating = total > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2) : 0;
    const ratingBreakdown = {
      5: feedback.filter((f) => f.rating === 5).length,
      4: feedback.filter((f) => f.rating === 4).length,
      3: feedback.filter((f) => f.rating === 3).length,
      2: feedback.filter((f) => f.rating === 2).length,
      1: feedback.filter((f) => f.rating === 1).length,
    };

    res.json({
      success: true,
      data: feedback,
      stats: { total, avgRating, ratingBreakdown },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback' });
  }
});

// Get all feedback for student (my feedback)
router.get('/my-feedback', auth, async (req, res) => {
  try {
    const feedback = await Feedback.find({ studentId: req.user.id })
      .populate('classId', 'name')
      .populate('sessionId', 'name date')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching my feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback' });
  }
});

// Mark feedback as helpful
router.put('/:feedbackId/helpful', auth, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error marking helpful:', error);
    res.status(500).json({ success: false, message: 'Error updating feedback' });
  }
});

// Get feedback summary/analytics
router.get('/analytics/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    const feedback = await Feedback.find({
      classId,
      status: 'active',
    });

    const categoryStats = {};
    feedback.forEach((f) => {
      if (!categoryStats[f.category]) {
        categoryStats[f.category] = { count: 0, totalRating: 0, avg: 0 };
      }
      categoryStats[f.category].count += 1;
      categoryStats[f.category].totalRating += f.rating;
    });

    // Calculate averages
    Object.keys(categoryStats).forEach((key) => {
      categoryStats[key].avg = (categoryStats[key].totalRating / categoryStats[key].count).toFixed(2);
    });

    res.json({ success: true, data: categoryStats });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

module.exports = router;
