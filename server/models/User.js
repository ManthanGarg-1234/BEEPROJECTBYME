const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const COLLEGE_DOMAIN = process.env.COLLEGE_DOMAIN || 'chitkara.edu';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    actualEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid actual email format']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ['teacher', 'student'],
        required: [true, 'Role is required']
    },
    rollNumber: {
        type: String,
        trim: true,
        match: [/^\d{10}$/, 'Roll number must be exactly 10 digits']
    },
    firstLogin: {
        type: Boolean,
        default: false
    },
    deviceId: {
        type: String,
        default: null
    },
    lastWarningSentAt: {
        type: Date,
        default: null
    },
    profilePhoto: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// ── Virtual: institutionalEmail ─────────────────────────────────────────────
// Students → firstname.rollnumber@chitkara.edu  (e.g., aarav.2401180001@chitkara.edu)
// Teachers → firstname.lastname@chitkara.edu    (e.g., sunita.sharma@chitkara.edu)
userSchema.virtual('institutionalEmail').get(function () {
    if (!this.name) return null;
    const parts = this.name.trim().toLowerCase().split(/\s+/);
    const firstName = parts[0];

    if (this.role === 'student' && this.rollNumber) {
        return `${firstName}.${this.rollNumber}@${COLLEGE_DOMAIN}`;
    }
    if (this.role === 'teacher') {
        const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
        return `${firstName}.${lastName}@${COLLEGE_DOMAIN}`;
    }
    return this.email;
});

// ── Method: getNotificationEmail ────────────────────────────────────────────
// Returns actualEmail if set, otherwise falls back to the login email
userSchema.methods.getNotificationEmail = function () {
    return this.actualEmail || this.email;
};

// Enable virtuals in JSON and Object output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
