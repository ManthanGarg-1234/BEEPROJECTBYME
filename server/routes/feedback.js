const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');

// Submit feedback (students only)
router.post('/submit', auth, authorize('student'), async (req, res) => {
  try {
    const { classId, rating, category, title, comment, isAnonymous } = req.body;

    // Validate required fields
    if (!classId || !rating || !category || !title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: classId, rating, category, title' 
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

    // Check if student already submitted feedback for this class in this category
    const existingFeedback = await Feedback.findOne({
      student: req.user._id,
      class: classId,
      category,
    });

    if (existingFeedback) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted feedback for this category' 
      });
    }

    const feedback = new Feedback({
      student: req.user._id,
      class: classId,
      teacher: classDoc.teacher,
      rating,
      category,
      title,
      comment: comment || null,
      isAnonymous: isAnonymous !== false, // Default to anonymous
    });

    await feedback.save();
    await feedback.populate('class', 'classId subject');

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'SUBMIT_FEEDBACK',
      entityType: 'Feedback',
      entityId: feedback._id,
      entityDetails: {
        name: `Feedback: ${category}`,
        description: `Rating: ${rating}/5 - ${title}`
      },
      newValues: { rating, category, title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.status(201).json({ 
      success: true, 
      message: 'Feedback submitted successfully', 
      data: feedback 
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: error.message || 'Error submitting feedback' });
  }
});

// Get feedback for a class (teacher only)
router.get('/class/:classId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns this class
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const feedbackList = await Feedback.find({
      class: classId,
      status: 'active',
    })
      .populate('student', 'name email rollNumber')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const total = feedbackList.length;
    const avgRating = total > 0 ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2) : 0;
    
    const ratingBreakdown = {
      5: feedbackList.filter((f) => f.rating === 5).length,
      4: feedbackList.filter((f) => f.rating === 4).length,
      3: feedbackList.filter((f) => f.rating === 3).length,
      2: feedbackList.filter((f) => f.rating === 2).length,
      1: feedbackList.filter((f) => f.rating === 1).length,
    };

    const categoryBreakdown = {};
    feedbackList.forEach(f => {
      if (!categoryBreakdown[f.category]) {
        categoryBreakdown[f.category] = 0;
      }
      categoryBreakdown[f.category]++;
    });

    // Hide student info if anonymous
    const sanitized = feedbackList.map(f => {
      const obj = f.toObject();
      if (f.isAnonymous) {
        obj.student = { name: 'Anonymous', email: '', rollNumber: '' };
      }
      return obj;
    });

    res.json({
      success: true,
      data: sanitized,
      stats: { 
        total, 
        avgRating, 
        ratingBreakdown,
        categoryBreakdown
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching feedback' });
  }
});

// Get all feedback submitted by student
router.get('/my-feedback', auth, authorize('student'), async (req, res) => {
  try {
    const feedback = await Feedback.find({ student: req.user._id })
      .populate('class', 'classId subject')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching my feedback:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching feedback' });
  }
});

// Mark feedback as helpful
router.put('/:feedbackId/helpful', auth, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { helpful } = req.body; // true for helpful, false for unhelpful

    if (helpful === undefined) {
      return res.status(400).json({ success: false, message: 'Please specify helpful or unhelpful' });
    }

    const updateField = helpful ? { $inc: { helpful: 1 } } : { $inc: { unhelpful: 1 } };
    
    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      updateField,
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error marking feedback:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating feedback' });
  }
});

// Get feedback analytics for a class (teacher only)
router.get('/analytics/:classId', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns this class
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const feedbackList = await Feedback.find({
      class: classId,
      status: 'active',
    });

    const categoryStats = {};
    const categoryBreakdown = {};

    feedbackList.forEach((f) => {
      if (!categoryStats[f.category]) {
        categoryStats[f.category] = { count: 0, totalRating: 0, avg: 0, details: [] };
      }
      categoryStats[f.category].count += 1;
      categoryStats[f.category].totalRating += f.rating;
      categoryStats[f.category].details.push({
        rating: f.rating,
        title: f.title,
        helpful: f.helpful,
        unhelpful: f.unhelpful,
        date: f.createdAt
      });

      categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
    });

    // Calculate averages
    Object.keys(categoryStats).forEach((key) => {
      categoryStats[key].avg = (categoryStats[key].totalRating / categoryStats[key].count).toFixed(2);
    });

    res.json({ 
      success: true, 
      data: {
        categoryStats,
        categoryBreakdown,
        totalFeedback: feedbackList.length,
        overallAverage: feedbackList.length > 0 
          ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching analytics' });
  }
});

module.exports = router;
