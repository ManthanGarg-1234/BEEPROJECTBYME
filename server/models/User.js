const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const COLLEGE_DOMAIN = process.env.COLLEGE_DOMAIN || 'abcuniversity.edu';
const domainPattern = new RegExp(`^[^@\s]+@${COLLEGE_DOMAIN.replace('.', '\.')}$`);

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
        match: [domainPattern, `Email must be at ${COLLEGE_DOMAIN}`]
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
