const mongoose = require('mongoose');

const suspiciousLogSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'INVALID_QR',
            'EXPIRED_QR',
            'GPS_OUT_OF_RANGE',
            'DUPLICATE_DEVICE',
            'DUPLICATE_ATTENDANCE',
            'SESSION_EXPIRED',
            'LATE_REJECTED'
        ]
    },
    deviceId: {
        type: String,
        default: null
    },
    location: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    details: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

suspiciousLogSchema.index({ session: 1 });
suspiciousLogSchema.index({ student: 1 });

module.exports = mongoose.model('SuspiciousLog', suspiciousLogSchema);
