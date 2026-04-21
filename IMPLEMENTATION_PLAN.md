# Smart Attendance System - Dynamic Implementation Plan

## Overview

Convert remaining static/incomplete components to full database-driven, real-time architecture.

**Total Estimated Effort**: 6-8 hours  
**Phases**: 4  
**Risk Level**: Low (builds on existing architecture)

---

## PHASE 1: Fix Missing Analytics Endpoints (2 hours)

These endpoints are referenced by frontend but don't exist in backend.

### 1.1 GET /api/sessions/history/:classId

**File**: `server/routes/session.js` - Add this endpoint

**Purpose**: Get past sessions for a class (used in manual attendance)

```javascript
// @route   GET /api/sessions/history/:classId
// @desc    Get session history for a class (past sessions)
// @access  Teacher
router.get('/history/:classId', auth, authorize('teacher'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() });
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });
        
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        // Get sessions sorted by startTime descending (newest first)
        const sessions = await Session.find({ class: classDoc._id })
            .select('_id startTime endTime isActive attendanceCount')
            .sort({ startTime: -1 })
            .lean();

        res.json(sessions);
    } catch (error) {
        console.error('Session history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
```

**Expected Response**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "startTime": "2024-04-21T09:00:00Z",
    "endTime": "2024-04-21T09:50:00Z",
    "isActive": false,
    "attendanceCount": 42
  }
]
```

**Frontend Update**: `client/src/pages/teacher/ManualAttendance.jsx`
- Currently fails silently
- Will now load session list

---

### 1.2 GET /api/analytics/group-overview

**File**: `server/routes/analytics.js` - Add this endpoint

**Purpose**: Overview matrix of attendance by groups & subjects

```javascript
// @route   GET /api/analytics/group-overview
// @desc    Get overview matrix for all groups and subjects
// @access  Teacher
router.get('/group-overview', auth, authorize('teacher'), async (req, res) => {
    try {
        // Get all teacher's classes
        const classes = await Class.find({ teacher: req.user._id })
            .select('_id classId subject students semesterStartDate semesterEndDate')
            .lean();

        if (classes.length === 0) {
            return res.json({
                groups: [],
                subjects: [],
                matrix: {}
            });
        }

        // Extract unique groups from classId format (CODE-GROUP)
        // e.g., "CN-G18" → groups are ["G18", "G19", ...]
        const groupSet = new Set();
        const subjectMap = {}; // { code: { name, count } }
        
        classes.forEach(cls => {
            // classId format: SUBCODE-GROUP (e.g., CN-G18, CN-G19)
            const parts = cls.classId.split('-');
            const subCode = parts[0];
            const group = parts.length > 1 ? parts[1] : 'ALL';
            
            groupSet.add(group);
            if (!subjectMap[subCode]) {
                subjectMap[subCode] = { name: cls.subject, classIds: [] };
            }
            subjectMap[subCode].classIds.push(cls._id);
        });

        const groups = Array.from(groupSet).sort();
        const subjects = Object.entries(subjectMap).map(([code, data]) => ({
            code,
            name: data.name
        }));

        // Build matrix: { subCode: { group: { present, late, absent, pct } } }
        const matrix = {};
        
        for (const [subCode, subData] of Object.entries(subjectMap)) {
            matrix[subCode] = {};
            
            for (const group of groups) {
                // Find classes matching this subject + group
                const classesForSubGroup = classes.filter(c => {
                    const [code, g] = c.classId.split('-');
                    return code === subCode && (g === group || !g);
                });

                if (classesForSubGroup.length === 0) {
                    matrix[subCode][group] = { present: 0, late: 0, absent: 0, pct: 0 };
                    continue;
                }

                // 1 aggregation: get attendance stats for all classes of this subject+group
                const classIds = classesForSubGroup.map(c => c._id);
                
                const sessions = await Session.find({ class: { $in: classIds } })
                    .select('_id')
                    .lean();
                const sessionIds = sessions.map(s => s._id);

                if (sessionIds.length === 0) {
                    matrix[subCode][group] = { present: 0, late: 0, absent: 0, pct: 0 };
                    continue;
                }

                // Count statuses
                const agg = await Attendance.aggregate([
                    { $match: { session: { $in: sessionIds } } },
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ]);

                const counts = {
                    present: 0,
                    late: 0,
                    absent: 0
                };

                for (const rec of agg) {
                    if (rec._id === 'Present') counts.present = rec.count;
                    else if (rec._id === 'Late') counts.late = rec.count;
                    else if (rec._id === 'Absent') counts.absent = rec.count;
                }

                const total = counts.present + counts.late + counts.absent;
                const pct = total > 0 ? ((counts.present + counts.late) / total * 100) : 0;

                matrix[subCode][group] = {
                    present: counts.present,
                    late: counts.late,
                    absent: counts.absent,
                    pct: Math.round(pct * 100) / 100
                };
            }
        }

        res.json({
            groups,
            subjects,
            matrix
        });
    } catch (error) {
        console.error('Group overview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
```

**Expected Response**:
```json
{
  "groups": ["G18", "G19", "G20"],
  "subjects": [
    { "code": "CN", "name": "Computer Networks" },
    { "code": "DSA", "name": "Data Structures" }
  ],
  "matrix": {
    "CN": {
      "G18": { "present": 80, "late": 5, "absent": 15, "pct": 85.0 },
      "G19": { "present": 72, "late": 8, "absent": 20, "pct": 80.0 }
    }
  }
}
```

---

### 1.3 GET /api/analytics/group-subject-daily/:subCode

**File**: `server/routes/analytics.js` - Add this endpoint

**Purpose**: Daily attendance breakdown by subject for all groups

```javascript
// @route   GET /api/analytics/group-subject-daily/:subCode
// @desc    Get daily attendance data by subject code for all groups
// @access  Teacher
router.get('/group-subject-daily/:subCode', auth, authorize('teacher'), async (req, res) => {
    try {
        const subCode = req.params.subCode.toUpperCase();
        
        // Get all teacher's classes matching this subject code
        const classes = await Class.find({ 
            teacher: req.user._id,
            classId: new RegExp(`^${subCode}-`)
        }).select('_id classId').lean();

        if (classes.length === 0) {
            return res.json({ daily: {}, dates: [] });
        }

        const classIds = classes.map(c => c._id);

        // Get all sessions + attendance for these classes
        const sessions = await Session.find({ class: { $in: classIds } })
            .select('_id startTime')
            .sort({ startTime: 1 })
            .lean();

        const sessionIds = sessions.map(s => s._id);

        if (sessionIds.length === 0) {
            return res.json({ daily: {}, dates: [] });
        }

        // Get attendance records
        const attendance = await Attendance.find({ session: { $in: sessionIds } })
            .select('session status')
            .lean();

        // Build per-session-date counts
        const sessionMap = {};
        sessions.forEach(s => {
            const dateStr = s.startTime.toISOString().split('T')[0];
            sessionMap[s._id.toString()] = dateStr;
        });

        const dateCounts = {};
        attendance.forEach(a => {
            const date = sessionMap[a.session.toString()];
            if (!date) return;
            
            if (!dateCounts[date]) {
                dateCounts[date] = { present: 0, late: 0, absent: 0 };
            }
            
            if (a.status === 'Present') dateCounts[date].present++;
            else if (a.status === 'Late') dateCounts[date].late++;
            else dateCounts[date].absent++;
        });

        // Get unique dates
        const dates = Object.keys(dateCounts).sort();

        // Build daily data per group from classId
        const daily = {};
        classes.forEach(c => {
            const [, group] = c.classId.split('-');
            if (!group) return;
            
            daily[group] = dates.map(date => {
                const counts = dateCounts[date] || { present: 0, late: 0, absent: 0 };
                const total = counts.present + counts.late + counts.absent;
                const pct = total > 0 ? ((counts.present + counts.late) / total * 100) : 0;
                
                return {
                    date,
                    present: counts.present,
                    late: counts.late,
                    absent: counts.absent,
                    pct: Math.round(pct * 100) / 100
                };
            });
        });

        res.json({ daily, dates });
    } catch (error) {
        console.error('Group subject daily error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
```

---

### 1.4 GET /api/analytics/group-day-pies/:subCode/:date

**File**: `server/routes/analytics.js` - Add this endpoint

**Purpose**: Pie chart data for a specific day and subject

```javascript
// @route   GET /api/analytics/group-day-pies/:subCode/:date
// @desc    Get pie chart data for a specific day
// @access  Teacher
router.get('/group-day-pies/:subCode/:date', auth, authorize('teacher'), async (req, res) => {
    try {
        const subCode = req.params.subCode.toUpperCase();
        const dateStr = req.params.date; // YYYY-MM-DD

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Get all teacher's classes matching subject
        const classes = await Class.find({ 
            teacher: req.user._id,
            classId: new RegExp(`^${subCode}-`)
        }).select('_id classId').lean();

        if (classes.length === 0) {
            return res.json({ date: dateStr, groups: {} });
        }

        const classIds = classes.map(c => c._id);

        // Get sessions for this date
        const dateStart = new Date(`${dateStr}T00:00:00Z`);
        const dateEnd = new Date(`${dateStr}T23:59:59Z`);

        const sessions = await Session.find({
            class: { $in: classIds },
            startTime: { $gte: dateStart, $lte: dateEnd }
        }).select('_id').lean();

        const sessionIds = sessions.map(s => s._id);

        if (sessionIds.length === 0) {
            return res.json({ date: dateStr, groups: {} });
        }

        // Get attendance for this date
        const attendance = await Attendance.find({ session: { $in: sessionIds } })
            .select('status')
            .lean();

        const counts = attendance.reduce((acc, a) => {
            if (a.status === 'Present') acc.present++;
            else if (a.status === 'Late') acc.late++;
            else acc.absent++;
            return acc;
        }, { present: 0, late: 0, absent: 0 });

        res.json({
            date: dateStr,
            groups: {
                all: counts  // All classes combined for this date
            }
        });
    } catch (error) {
        console.error('Group day pies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
```

---

### 1.5 GET /api/analytics/class-daily/:classId

**File**: `server/routes/analytics.js` - Add this endpoint

**Purpose**: Student's daily attendance trends for a specific class

```javascript
// @route   GET /api/analytics/class-daily/:classId
// @desc    Get daily attendance for a student in a class
// @access  Student (own class)
router.get('/class-daily/:classId', auth, authorize('student'), async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId.toUpperCase() })
            .select('_id students')
            .lean();

        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        // Verify student is enrolled
        const isEnrolled = classDoc.students.some(s => s.toString() === req.user._id.toString());
        if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this class' });

        // Get all sessions for this class
        const sessions = await Session.find({ class: classDoc._id })
            .select('_id startTime')
            .sort({ startTime: 1 })
            .lean();

        if (sessions.length === 0) {
            return res.json({ daily: [] });
        }

        // Get this student's attendance across all sessions
        const attendance = await Attendance.find({
            class: classDoc._id,
            student: req.user._id
        }).select('session status').lean();

        const attMap = {};
        attendance.forEach(a => {
            attMap[a.session.toString()] = a.status;
        });

        // Build daily array
        const daily = sessions.map(session => {
            const dateStr = session.startTime.toISOString().split('T')[0];
            const status = attMap[session._id.toString()] || 'Absent';
            
            return {
                date: dateStr,
                status,
                markedAt: attendance.find(a => a.session.toString() === session._id.toString())?.createdAt
            };
        });

        res.json({ daily });
    } catch (error) {
        console.error('Class daily error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
```

---

## PHASE 2: Build Marks/Grades System (3-4 hours)

### 2.1 Create Marks Database Schema

**File**: `server/models/Marks.js` (CREATE NEW)

```javascript
const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
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
    
    // Components (each has max and obtained)
    quiz: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: 0 }
    },
    midterm: {
        max: { type: Number, default: 30 },
        obtained: { type: Number, default: 0 }
    },
    assignment: {
        max: { type: Number, default: 10 },
        obtained: { type: Number, default: 0 }
    },
    practical: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: null }
    },
    project: {
        max: { type: Number, default: 20 },
        obtained: { type: Number, default: null }
    },
    
    // Derived fields (calculated on save)
    total: { type: Number, default: 0 },
    maxTotal: { type: Number, default: 80 },
    percentage: { type: Number, default: 0 },
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
    
    comments: String
}, {
    timestamps: true
});

// Compound unique index
marksSchema.index({ student: 1, class: 1 }, { unique: true });
marksSchema.index({ class: 1 });
marksSchema.index({ student: 1 });

// Pre-save hook to calculate totals and grade
marksSchema.pre('save', function (next) {
    // Calculate total
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
    
    // Assign grade
    if (this.percentage >= 90) this.grade = 'A';
    else if (this.percentage >= 80) this.grade = 'B';
    else if (this.percentage >= 70) this.grade = 'C';
    else if (this.percentage >= 60) this.grade = 'D';
    else if (this.percentage >= 0) this.grade = 'F';
    else this.grade = 'NA';
    
    next();
});

module.exports = mongoose.model('Marks', marksSchema);
```

---

### 2.2 Create Marks Routes

**File**: `server/routes/marks.js` (CREATE NEW)

```javascript
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

        // Verify class exists and teacher owns it
        const classDoc = await Class.findById(classId);
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });
        if (classDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not your class' });
        }

        // Verify student is enrolled
        if (!classDoc.students.includes(studentId)) {
            return res.status(400).json({ message: 'Student not enrolled in this class' });
        }

        // Check if marks already exist
        let marks = await Marks.findOne({ student: studentId, class: classId });

        if (marks) {
            // Update existing
            if (quiz !== undefined) marks.quiz.obtained = quiz;
            if (midterm !== undefined) marks.midterm.obtained = midterm;
            if (assignment !== undefined) marks.assignment.obtained = assignment;
            if (practical !== undefined) marks.practical.obtained = practical;
            if (project !== undefined) marks.project.obtained = project;
            if (comments) marks.comments = comments;
        } else {
            // Create new
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
        res.json({ message: 'Marks deleted' });
    } catch (error) {
        console.error('Delete marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== STUDENT ENDPOINTS ==========

// @route   GET /api/marks/student/:classId
// @desc    Get own marks for a class
// @access  Student (enrolled in class)
router.get('/student/:classId', auth, authorize('student'), async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.classId)
            .populate('teacher', 'name');

        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        // Verify enrolled
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
            class: classDoc
        });
    } catch (error) {
        console.error('Get student marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/marks/stats/:classId
// @desc    Get class-wide marks statistics
// @access  Teacher
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
                gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
            });
        }

        const stats = {
            totalStudents: classDoc.students.length,
            marksEntered: marks.length,
            avgPercentage: marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length,
            gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
        };

        marks.forEach(m => {
            if (m.grade && m.grade !== 'NA') stats.gradeDistribution[m.grade]++;
        });

        res.json(stats);
    } catch (error) {
        console.error('Get marks stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
```

---

### 2.3 Register Marks Routes in Server

**File**: `server/server.js` - Add marks route

```javascript
// Around line 72, add:
app.use('/api/marks', require('./routes/marks'));
```

---

### 2.4 Create Teacher UI for Marks Entry

**File**: `client/src/pages/teacher/MarksManagement.jsx` (CREATE NEW)

```jsx
import { useState, useEffect } from 'react';
import api from '../../api';

const MarksManagement = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchStudentsAndMarks(selectedClass);
            fetchStats(selectedClass);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0]._id);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStudentsAndMarks = async (classId) => {
        setLoading(true);
        try {
            const [classRes, marksRes] = await Promise.all([
                api.get(`/classes/${classId}`),
                api.get(`/marks/class/${classId}`)
            ]);

            const classData = classRes.data;
            const marksData = marksRes.data;

            const marksMap = {};
            marksData.forEach(m => {
                marksMap[m.student._id] = m;
            });

            setStudents(classData.students || []);
            setMarks(marksMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (classId) => {
        try {
            const res = await api.get(`/marks/stats/${classId}`);
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkChange = (studentId, component, value) => {
        const current = marks[studentId] || {
            student: { _id: studentId },
            quiz: { obtained: 0 },
            midterm: { obtained: 0 },
            assignment: { obtained: 0 }
        };

        const updated = { ...current };
        updated[component].obtained = parseFloat(value) || 0;
        
        setMarks(prev => ({
            ...prev,
            [studentId]: updated
        }));
    };

    const saveMarks = async (studentId) => {
        setSaving(true);
        try {
            const marksData = marks[studentId];
            await api.post('/marks', {
                studentId,
                classId: selectedClass,
                quiz: marksData.quiz?.obtained || 0,
                midterm: marksData.midterm?.obtained || 0,
                assignment: marksData.assignment?.obtained || 0,
                practical: marksData.practical?.obtained || null,
                project: marksData.project?.obtained || null
            });
            await fetchStudentsAndMarks(selectedClass);
            await fetchStats(selectedClass);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const selectedClassData = classes.find(c => c._id === selectedClass);

    return (
        <div className="page-container">
            <h1 className="section-title text-3xl mb-2">Marks Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Enter and manage student marks/grades
            </p>

            {/* Class Selector */}
            <div className="glass-card-solid p-6 mb-8">
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="input-field max-w-sm"
                >
                    {classes.map(c => (
                        <option key={c._id} value={c._id}>
                            {c.classId} — {c.subject}
                        </option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="glass-card-solid p-4">
                        <p className="text-2xl font-bold">{stats.totalStudents}</p>
                        <p className="text-xs text-gray-400">Total Students</p>
                    </div>
                    <div className="glass-card-solid p-4">
                        <p className="text-2xl font-bold">{stats.marksEntered}</p>
                        <p className="text-xs text-gray-400">Marks Entered</p>
                    </div>
                    <div className="glass-card-solid p-4">
                        <p className="text-2xl font-bold">{stats.avgPercentage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-400">Average %</p>
                    </div>
                    <div className="glass-card-solid p-4">
                        <div className="flex gap-2 text-xs">
                            {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
                                <span key={grade} className="px-2 py-1 rounded bg-slate-800">
                                    {grade}:{count}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Grade Distribution</p>
                    </div>
                </div>
            )}

            {/* Marks Table */}
            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="glass-card-solid p-6 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-2">Name</th>
                                <th className="text-center py-2">Roll</th>
                                <th className="text-center py-2">Quiz/20</th>
                                <th className="text-center py-2">Mid/30</th>
                                <th className="text-center py-2">Assign/10</th>
                                <th className="text-center py-2">Total</th>
                                <th className="text-center py-2">Grade</th>
                                <th className="text-center py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
                                const m = marks[student._id];
                                const total = (m?.quiz?.obtained || 0) + (m?.midterm?.obtained || 0) + (m?.assignment?.obtained || 0);
                                const pct = total / 60 * 100;
                                const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
                                
                                return (
                                    <tr key={student._id} className="border-b border-slate-700 hover:bg-slate-900/30">
                                        <td className="py-2">{student.name}</td>
                                        <td className="text-center text-xs text-gray-400">{student.rollNumber}</td>
                                        <td className="text-center">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={m?.quiz?.obtained || 0}
                                                onChange={(e) => handleMarkChange(student._id, 'quiz', e.target.value)}
                                                className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="30" 
                                                value={m?.midterm?.obtained || 0}
                                                onChange={(e) => handleMarkChange(student._id, 'midterm', e.target.value)}
                                                className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="10" 
                                                value={m?.assignment?.obtained || 0}
                                                onChange={(e) => handleMarkChange(student._id, 'assignment', e.target.value)}
                                                className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white"
                                            />
                                        </td>
                                        <td className="text-center font-bold">{total}</td>
                                        <td className="text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                grade === 'A' ? 'bg-green-500/20 text-green-400' :
                                                grade === 'B' ? 'bg-blue-500/20 text-blue-400' :
                                                grade === 'C' ? 'bg-yellow-500/20 text-yellow-400' :
                                                grade === 'D' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {grade}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <button 
                                                onClick={() => saveMarks(student._id)}
                                                disabled={saving}
                                                className="btn-primary text-xs py-1 px-2"
                                            >
                                                Save
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MarksManagement;
```

---

### 2.5 Update App.jsx to Add Marks Route

**File**: `client/src/App.jsx` - Add lazy import and route

```jsx
// Around line 14, add:
const MarksManagement = lazy(() => import('./pages/teacher/MarksManagement'));

// In teacher routes section, add:
<Route path="/teacher/marks" element={
    <ProtectedRoute role="teacher"><MarksManagement /></ProtectedRoute>
} />
```

---

### 2.6 Remove Hardcoded Marks from StudentDashboard

**File**: `client/src/pages/student/StudentDashboard.jsx`

**Replace** (lines ~195-241):
```jsx
const marksBySubject = {
    DSA001: { quiz: 18, mid: 26, assignment: 9, total: 53 },
    // ... etc
};
```

**With**:
```jsx
const fetchMarks = async (classId) => {
    try {
        const res = await api.get(`/marks/student/${classId}`);
        if (res.data.found) {
            return res.data;
        }
        return null;
    } catch (err) {
        console.error('Failed to load marks:', err);
        return null;
    }
};

const [marksData, setMarksData] = useState(null);

useEffect(() => {
    if (selectedClassId) {
        fetchMarks(selectedClassId).then(setMarksData);
    }
}, [selectedClassId]);
```

**Replace marks display section** in sidebar:
```jsx
{marksData ? (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">{selectedClass.subject}</p>
        <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-cyan-200">
                {marksData.total}/{marksData.maxTotal}
            </span>
        </div>
        <div className="mt-2 text-xs">
            <p className="text-slate-200">Grade: <span className="font-bold">{marksData.grade}</span></p>
            <p className="text-slate-200">Percentage: <span className="font-bold">{marksData.percentage.toFixed(1)}%</span></p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            {['quiz', 'midterm', 'assignment'].map((key) => (
                <div key={key} className="rounded-lg bg-slate-800/70 border border-slate-700/60 px-2 py-2 text-center">
                    <p className="text-slate-400 uppercase text-[10px]">{key}</p>
                    <p className="text-white font-semibold mt-1">
                        {marksData[key].obtained || 0}
                    </p>
                </div>
            ))}
        </div>
    </div>
) : (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 text-center text-xs text-slate-400">
        Marks not yet available
    </div>
)}
```

---

## PHASE 3: Testing & Validation (1-2 hours)

### Test Checklist

**Analytics Endpoints**:
- [ ] Session history loads in ManualAttendance
- [ ] Group overview shows correct matrix
- [ ] Subject daily shows correct trends
- [ ] Day pies work with date picker
- [ ] Class daily shows student's attendance trend

**Marks System**:
- [ ] Teacher can enter marks for a student
- [ ] Marks saved correctly to DB
- [ ] Student can view own marks
- [ ] Grade calculated correctly
- [ ] Stats show correct distribution
- [ ] Can edit existing marks

**Frontend Integration**:
- [ ] StudentDashboard shows real marks
- [ ] Teacher dashboard has new Marks Management link
- [ ] All loading states working
- [ ] Error messages clear
- [ ] Mobile responsive

---

## PHASE 4: Deployment (30 mins)

1. Commit all changes
2. Backup MongoDB
3. Deploy to staging
4. Run full test suite
5. Deploy to production
6. Monitor for errors

---

## Summary

| Phase | Hours | Components |
|---|---|---|
| 1 | 2 | 5 analytics endpoints |
| 2 | 3-4 | Marks schema + 5 endpoints + 2 UIs |
| 3 | 1-2 | Testing all flows |
| 4 | 0.5 | Deployment |
| **Total** | **6-8** | **~40 API changes + 3 new pages** |

After completion, your system will be:
- ✅ 100% database-driven (no hardcoded data)
- ✅ Real-time for all critical flows
- ✅ Production-ready with full testing
- ✅ Fully documented

