const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required']
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Class is required']
    },
    
    // Components (each has max and obtained)
    quiz: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: 0, min: 0 }
    },
    midterm: {
        max: { type: Number, default: 30 },
        obtained: { type: Number, default: 0, min: 0 }
    },
    assignment: {
        max: { type: Number, default: 10 },
        obtained: { type: Number, default: 0, min: 0 }
    },
    practical: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: null, min: 0 }
    },
    project: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: null, min: 0 }
    },
    
    // Derived fields (calculated on save)
    total: { type: Number, default: 0 },
    maxTotal: { type: Number, default: 80 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    grade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F', 'NA'],
        default: 'NA'
    },
    
    // Meta
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    comments: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Compound unique index: one marks entry per student per class
marksSchema.index({ student: 1, class: 1 }, { unique: true });
marksSchema.index({ class: 1 });
marksSchema.index({ student: 1 });

// Pre-save hook to calculate totals and grade
marksSchema.pre('save', function (next) {
    // Calculate total obtained marks
    this.total = 0;
    this.maxTotal = 0;
    
    ['quiz', 'midterm', 'assignment', 'practical', 'project'].forEach(component => {
        if (this[component].obtained !== null) {
            this.total += this[component].obtained;
            this.maxTotal += this[component].max;
        }
    });
    
    // Calculate percentage
    this.percentage = this.maxTotal > 0 
        ? Math.round((this.total / this.maxTotal) * 10000) / 100 
        : 0;
    
    // Assign grade based on percentage
    if (this.percentage >= 90) this.grade = 'A';
    else if (this.percentage >= 80) this.grade = 'B';
    else if (this.percentage >= 70) this.grade = 'C';
    else if (this.percentage >= 60) this.grade = 'D';
    else if (this.percentage > 0) this.grade = 'F';
    else this.grade = 'NA';
    
    next();
});

module.exports = mongoose.model('Marks', marksSchema);
