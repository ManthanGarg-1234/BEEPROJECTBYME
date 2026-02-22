const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Late', 'Absent'],
        required: true
    },
    deviceId: {
        type: String,
        required: true
    },
    distance: {
        type: Number,
        default: 0
    },
    location: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    suspiciousFlag: {
        type: Boolean,
        default: false
    },
    isManual: {
        type: Boolean,
        default: false
    },
    markedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index: one attendance per student per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ class: 1, student: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
