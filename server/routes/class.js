const express = require('express');
const { validationResult } = require('express-validator');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { classValidation } = require('../middleware/validators');
const { generateTempPassword } = require('../utils/passwordGenerator');
const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/classes
// @desc    Create a new class
// @access  Teacher
router.post('/', auth, authorize('teacher'), classValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { classId, subject, semesterStartDate, semesterEndDate } = req.body;

        // Check duplicate
        const existing = await Class.findOne({ classId: classId.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: 'Class ID already exists' });
        }

        // Validate dates
        const start = new Date(semesterStartDate);
        const end = new Date(semesterEndDate);
        if (end <= start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const newClass = new Class({
            classId: classId.toUpperCase(),
            subject,
            teacher: req.user._id,
            semesterStartDate: start,
            semesterEndDate: end
        });

        await newClass.save();
        res.status(201).json(newClass);
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes
// @desc    Get all classes for current teacher
// @access  Teacher
router.get('/', auth, authorize('teacher'), async (req, res) => {
    try {
        const classes = await Class.find({ teacher: req.user._id })
            .populate('students', 'name email rollNumber')
            .sort({ createdAt: -1 });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes/enrolled
// @desc    Get classes where student is enrolled
// @access  Student
router.get('/enrolled', auth, authorize('student'), async (req, res) => {
    try {
        const classes = await Class.find({ students: req.user._id })
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.id)
            .populate('students', 'name email rollNumber')
            .populate('teacher', 'name email');

        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        res.json(classDoc);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/classes/:id/bulk-enroll
// @desc    Bulk enroll students from textarea input
// @access  Teacher
router.post('/:id/bulk-enroll', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }

        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { studentsData } = req.body;
        if (!studentsData || !studentsData.trim()) {
            return res.status(400).json({ message: 'Students data is required' });
        }

        const lines = studentsData.split('\n').filter(line => line.trim());
        const domain = process.env.COLLEGE_DOMAIN || 'abcuniversity.edu';
        const results = {
            created: [],
            existing: [],
            enrolled: [],
            errors: []
        };

        for (const line of lines) {
            try {
                // Parse multiple formats: "101 - Rahul", "101,Rahul", "101 Rahul"
                let rollNumber, name;
                const trimmed = line.trim();

                if (trimmed.includes(' - ')) {
                    [rollNumber, name] = trimmed.split(' - ').map(s => s.trim());
                } else if (trimmed.includes(',')) {
                    [rollNumber, name] = trimmed.split(',').map(s => s.trim());
                } else {
                    const parts = trimmed.split(/\s+/);
                    rollNumber = parts[0];
                    name = parts.slice(1).join(' ');
                }

                if (!rollNumber || !name) {
                    results.errors.push({ line: trimmed, reason: 'Could not parse roll number and name' });
                    continue;
                }

                // Pad roll number to 10 digits
                rollNumber = rollNumber.padStart(10, '0');

                if (!/^\d{10}$/.test(rollNumber)) {
                    results.errors.push({ line: trimmed, reason: 'Invalid roll number format' });
                    continue;
                }

                const email = `${rollNumber}@${domain}`;

                // Check if user already exists
                let user = await User.findOne({ email });

                if (!user) {
                    // Create new student account
                    const tempPassword = generateTempPassword();
                    user = new User({
                        name,
                        email,
                        password: tempPassword,
                        role: 'student',
                        rollNumber,
                        firstLogin: true
                    });
                    await user.save();

                    // Send welcome email (non-blocking)
                    sendWelcomeEmail(email, name, tempPassword).catch(err =>
                        console.error('Welcome email failed:', err.message)
                    );

                    results.created.push({
                        name,
                        rollNumber,
                        email,
                        tempPassword
                    });
                } else {
                    results.existing.push({ name: user.name, rollNumber: user.rollNumber, email });
                }

                // Add to class if not already enrolled
                if (!classDoc.students.includes(user._id)) {
                    classDoc.students.push(user._id);
                    results.enrolled.push({ name: user.name, rollNumber: user.rollNumber });
                }
            } catch (err) {
                results.errors.push({ line: line.trim(), reason: err.message });
            }
        }

        await classDoc.save();

        res.json({
            message: 'Bulk enrollment complete',
            summary: {
                totalProcessed: lines.length,
                newAccountsCreated: results.created.length,
                existingAccounts: results.existing.length,
                newlyEnrolled: results.enrolled.length,
                errors: results.errors.length
            },
            details: results
        });
    } catch (error) {
        console.error('Bulk enroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/classes/:id
// @desc    Delete a class
// @access  Teacher
router.delete('/:id', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found' });
        }
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Class.findByIdAndDelete(req.params.id);
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
