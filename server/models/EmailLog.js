const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Teacher is required']
    },
    recipients: [
        {
            student: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            email: String,
            name: String,
            attendance: Number, // attendance percentage at time of send
            status: {
                type: String,
                enum: ['sent', 'failed', 'pending'],
                default: 'pending'
            },
            failureReason: String, // if status is 'failed'
            gmailMessageId: String, // Gmail's message ID if successful
        }
    ],
    subject: String,
    body: String,
    template: String, // name of template used
    attachTemplate: {
        type: Boolean,
        default: false
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    classId: String, // denormalized for quick lookup
    subject_code: String, // denormalized subject code
    
    // Batch tracking
    batchId: String, // unique batch identifier for this send operation
    totalRecipients: Number,
    successCount: {
        type: Number,
        default: 0
    },
    failureCount: {
        type: Number,
        default: 0
    },
    
    // Gmail API tracking
    gmailTokenUsed: Boolean,
    gmailAccountEmail: String, // teacher's Gmail email used to send
    
    // Metadata
    sentAt: Date,
    completedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for quick lookup
emailLogSchema.index({ teacher: 1, sentAt: -1 });
emailLogSchema.index({ 'recipients.student': 1, createdAt: -1 });
emailLogSchema.index({ batchId: 1 });
emailLogSchema.index({ class: 1, sentAt: -1 });

// Prevent duplicate sends within 24 hours to same student
emailLogSchema.index({ 'recipients.student': 1, class: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
