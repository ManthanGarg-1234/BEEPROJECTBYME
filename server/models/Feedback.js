const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    category: {
      type: String,
      enum: ['class', 'teacher', 'material', 'overall'],
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    unhelpful: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'flagged', 'removed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Index for queries
feedbackSchema.index({ studentId: 1, category: 1 });
feedbackSchema.index({ classId: 1, category: 1 });
feedbackSchema.index({ rating: 1, category: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
