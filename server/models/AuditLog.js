const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'APPROVE_LEAVE',
        'SUBMIT_FEEDBACK',
        'SEND_EMAIL',
        'MARK_ATTENDANCE',
        'EXPORT_DATA',
      ],
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['User', 'Class', 'Session', 'Attendance', 'Marks', 'Leave', 'Email', 'Feedback'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    entityDetails: {
      name: String,
      description: String,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    deviceInfo: {
      browser: String,
      platform: String,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  { timestamps: true }
);

// Index for queries
auditLogSchema.index({ user: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ status: 1 });

// Keep audit logs for 2 years by default
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
