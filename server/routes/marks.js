const express = require('express');
const Marks = require('../models/Marks');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// ========== TEACHER ENDPOINTS ==========

// @route   POST /api/marks
// @desc    Create or update marks for a student in a class
// @access  Teacher (of that class)
router.post('/', auth, authorize('teacher'), async (req, res) => {
    try {
        const { studentId, classId, quiz, midterm, assignment, practical, project, comments } = req.body;

        // Validate required fields
        if (!studentId || !classId) {
            return res.status(400).json({ message: 'studentId and classId are required' });
        }

        // Verify class exists and teacher owns it
        const classDoc = await Class.findById(classId);
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        // Verify student is enrolled in this class
        if (!classDoc.students.includes(studentId)) {
            return res.status(400).json({ message: 'Student not enrolled in this class' });
        }

        // Check if marks already exist
        let marks = await Marks.findOne({ student: studentId, class: classId });

        if (marks) {
            // Update existing marks
            if (quiz !== undefined) marks.quiz.obtained = quiz;
            if (midterm !== undefined) marks.midterm.obtained = midterm;
            if (assignment !== undefined) marks.assignment.obtained = assignment;
            if (practical !== undefined) marks.practical.obtained = practical;
            if (project !== undefined) marks.project.obtained = project;
            if (comments) marks.comments = comments;
        } else {
            // Create new marks entry
            marks = new Marks({
                student: studentId,
                class: classId,
                quiz: { obtained: quiz || 0 },
                midterm: { obtained: midterm || 0 },
                assignment: { obtained: assignment || 0 },
                practical: { obtained: practical || null },
                project: { obtained: project || null },
                addedBy: req.user._id,
                comments
            });
        }

        await marks.save();

        // Populate for response
        await marks.populate('student', 'name rollNumber email');

        res.status(marks.isNew ? 201 : 200).json(marks);
    } catch (error) {
        console.error('Create marks error:', error);
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(e => e.message)[0];
            return res.status(400).json({ message: msg });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/marks/class/:classId
// @desc    Get all marks for a class
// @access  Teacher (of that class)
router.get('/class/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.classId);
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        const marks = await Marks.find({ class: req.params.classId })
            .populate('student', 'name rollNumber email')
            .sort({ 'student.rollNumber': 1 })
            .lean();

        res.json(marks);
    } catch (error) {
        console.error('Get class marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/marks/:id
// @desc    Update an existing mark entry
// @access  Teacher (of that class)
router.put('/:id', auth, authorize('teacher'), async (req, res) => {
    try {
        const marks = await Marks.findById(req.params.id).populate('class');
        if (!marks) return res.status(404).json({ message: 'Mark not found' });

        const classDoc = marks.class;
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { quiz, midterm, assignment, practical, project, comments } = req.body;

        if (quiz !== undefined) marks.quiz.obtained = quiz;
        if (midterm !== undefined) marks.midterm.obtained = midterm;
        if (assignment !== undefined) marks.assignment.obtained = assignment;
        if (practical !== undefined) marks.practical.obtained = practical;
        if (project !== undefined) marks.project.obtained = project;
        if (comments) marks.comments = comments;

        await marks.save();
        await marks.populate('student', 'name rollNumber email');

        res.json(marks);
    } catch (error) {
        console.error('Update marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/marks/:id
// @desc    Delete a mark entry
// @access  Teacher (of that class)
router.delete('/:id', auth, authorize('teacher'), async (req, res) => {
    try {
        const marks = await Marks.findById(req.params.id).populate('class');
        if (!marks) return res.status(404).json({ message: 'Mark not found' });

        const classDoc = marks.class;
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Marks.findByIdAndDelete(req.params.id);
        res.json({ message: 'Marks deleted successfully' });
    } catch (error) {
        console.error('Delete marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/marks/stats/:classId
// @desc    Get class-wide marks statistics
// @access  Teacher (of that class)
router.get('/stats/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.classId);
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        const marks = await Marks.find({ class: req.params.classId }).lean();

        if (marks.length === 0) {
            return res.json({
                totalStudents: classDoc.students.length,
                marksEntered: 0,
                avgPercentage: 0,
                gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0 },
                topPerformers: [],
                lowPerformers: []
            });
        }

        const stats = {
            totalStudents: classDoc.students.length,
            marksEntered: marks.length,
            avgPercentage: marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length,
            gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0, NA: 0 }
        };

        marks.forEach(m => {
            if (m.grade && m.grade !== 'NA') stats.gradeDistribution[m.grade]++;
            else if (m.grade === 'NA') stats.gradeDistribution.NA++;
        });

        // Find top 5 and bottom 5
        const sorted = [...marks].sort((a, b) => b.percentage - a.percentage);
        stats.topPerformers = sorted.slice(0, 5).map(m => ({
            studentId: m.student,
            percentage: m.percentage,
            grade: m.grade
        }));
        stats.lowPerformers = sorted.slice(-5).reverse().map(m => ({
            studentId: m.student,
            percentage: m.percentage,
            grade: m.grade
        }));

        res.json(stats);
    } catch (error) {
        console.error('Get marks stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== STUDENT ENDPOINTS ==========

// @route   GET /api/marks/student/:classId
// @desc    Get own marks for a class (student view)
// @access  Student (enrolled in class)
router.get('/student/:classId', auth, authorize('student'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.classId)
            .populate('teacher', 'name');

        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        // Verify student is enrolled
        if (!classDoc.students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not enrolled in this class' });
        }

        const marks = await Marks.findOne({ student: req.user._id, class: req.params.classId })
            .lean();

        if (!marks) {
            return res.json({
                found: false,
                message: 'Marks not yet available for this class'
            });
        }

        res.json({
            found: true,
            ...marks,
            class: {
                _id: classDoc._id,
                classId: classDoc.classId,
                subject: classDoc.subject,
                teacher: classDoc.teacher
            }
        });
    } catch (error) {
        console.error('Get student marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
