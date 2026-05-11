const AuditLog = require('../models/AuditLog');

// Middleware to log audit trail
const auditLog = async (userId, action, entityType, entityId, oldValues = {}, newValues = {}, req = null, severity = 'info') => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: req?.ip || null,
      userAgent: req?.get('user-agent') || null,
      severity,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

module.exports = auditLog;
