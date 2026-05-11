const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      required: [true, 'Rating is required'],
    },
    category: {
      type: String,
      enum: ['teaching', 'class-material', 'pace', 'engagement', 'overall'],
      required: [true, 'Category is required'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      required: [true, 'Title is required'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    helpful: {
      type: Number,
      default: 0,
      min: 0,
    },
    unhelpful: {
      type: Number,
      default: 0,
      min: 0,
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
feedbackSchema.index({ student: 1, category: 1 });
feedbackSchema.index({ class: 1, category: 1 });
feedbackSchema.index({ class: 1, rating: 1 });
feedbackSchema.index({ teacher: 1, status: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
