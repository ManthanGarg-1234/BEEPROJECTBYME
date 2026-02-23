const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    qrToken: {
        type: String,
        required: true
    },
    qrExpiresAt: {
        type: Date,
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    attendanceWindowEnd: {
        type: Date,
        required: true
    },
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        accuracy: { type: Number, default: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    attendanceCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster lookups
sessionSchema.index({ class: 1, isActive: 1 });
sessionSchema.index({ qrToken: 1 });

module.exports = mongoose.model('Session', sessionSchema);
