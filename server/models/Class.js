const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: [true, 'Class ID is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    subject: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    semesterStartDate: {
        type: Date,
        required: [true, 'Semester start date is required']
    },
    semesterEndDate: {
        type: Date,
        required: [true, 'Semester end date is required']
    }
}, {
    timestamps: true
});

// Virtual: semester progress percentage
classSchema.virtual('semesterProgress').get(function () {
    const now = new Date();
    const start = new Date(this.semesterStartDate);
    const end = new Date(this.semesterEndDate);
    const total = end - start;
    const elapsed = now - start;
    if (elapsed <= 0) return 0;
    if (elapsed >= total) return 100;
    return Math.round((elapsed / total) * 10000) / 100;
});

classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);
