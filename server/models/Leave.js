const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
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
    leaveType: {
      type: String,
      enum: ['medical', 'personal', 'emergency', 'event', 'other'],
      required: [true, 'Leave type is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    numberOfDays: {
      type: Number,
      default: 1,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentName: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalNotes: {
      type: String,
      default: null,
      maxlength: 500,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Calculate number of days before saving
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

// Index for faster queries
leaveSchema.index({ student: 1, status: 1 });
leaveSchema.index({ class: 1, status: 1 });
leaveSchema.index({ student: 1, class: 1 });
leaveSchema.index({ startDate: -1, endDate: -1 });
leaveSchema.index({ approvedBy: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
