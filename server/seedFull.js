/**
 * seedFull.js — Full seed for G18-G22, 5 subjects, 22-day attendance
 * Uses native MongoDB driver to bypass Mongoose validators
 * Run: node seedFull.js
 * All accounts password: Student@123
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendease';
const DOMAIN = 'chitkara.edu';
const PASSWORD = 'Student@123';
const GROUPS = ['G18', 'G19', 'G20', 'G21', 'G22'];

const SUBJECTS = [
    { code: 'CN', name: 'Computer Networks' },
    { code: 'BE', name: 'Backend Engineering' },
    { code: 'DSOOPS', name: 'DSOOPS' },
    { code: 'LINUX', name: 'Linux Administration' },
    { code: 'DM', name: 'Discrete Mathematics' },
];

const TEACHER_NAMES = [
    'Dr. Rajesh Kumar', 'Dr. Sunita Sharma', 'Dr. Anil Gupta',
    'Dr. Meera Singh', 'Dr. Vikram Patel'
];

const STUDENT_NAMES = {
    G18: ['Aditya Sharma', 'Bhavna Gupta', 'Chirag Verma', 'Divya Singh', 'Eshan Arora',
        'Fatima Khan', 'Gaurav Mehta', 'Harpreet Kaur', 'Isha Patel', 'Jay Kapoor'],
    G19: ['Karan Malhotra', 'Lavanya Nair', 'Manish Soni', 'Neha Tiwari', 'Omkar Joshi',
        'Priya Bansal', 'Qasim Ali', 'Ritu Chauhan', 'Suresh Kumar', 'Tanvi Bose'],
    G20: ['Uday Pandey', 'Vanya Reddy', 'Wasim Khan', 'Xena Das', 'Yash Trivedi',
        'Zara Sheikh', 'Ananya Roy', 'Bikash Panda', 'Chandni Mishra', 'Deepak Yadav'],
    G21: ['Elan Varma', 'Farhan Siddiqui', 'Gracy Thomas', 'Hemant Jain', 'Ira Saxena',
        'Jatin Khanna', 'Kavya Pillai', 'Lakshmi Iyer', 'Mohit Dubey', 'Nikita Rawat'],
    G22: ['Ojal Bhatt', 'Pankaj Rana', 'Qadir Hussain', 'Rekha Aggarwal', 'Sachin Thakur',
        'Tanya Chaudhary', 'Umesh Desai', 'Vidya Krishnan', 'Waqar Mirza', 'Younus Ahmed'],
};

const ROLL_BASES = { G18: 2218000, G19: 2219000, G20: 2220000, G21: 2221000, G22: 2222000 };

function randomStatus() {
    const r = Math.random();
    if (r < 0.60) return 'Present';
    if (r < 0.76) return 'Late';
    return 'Absent';
}

function pastWeekdays(n) {
    const days = [];
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    while (days.length < n) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) days.push(new Date(d));
        d.setDate(d.getDate() - 1);
    }
    return days.reverse();
}

async function main() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();
    console.log('✅ MongoDB connected (native driver)');

    // ── Clear old data ─────────────────────────────────────────────────────────
    await db.collection('attendances').deleteMany({});
    await db.collection('sessions').deleteMany({});
    await db.collection('classes').deleteMany({});
    await db.collection('users').deleteMany({ email: { $regex: `@${DOMAIN}$` } });
    console.log('🗑  Cleared old data');

    const now = new Date();
    const hashed = await bcrypt.hash(PASSWORD, 12);

    // ── Teachers ───────────────────────────────────────────────────────────────
    const teacherIds = SUBJECTS.map(() => new ObjectId());
    const teacherDocs = SUBJECTS.map((sub, i) => ({
        _id: teacherIds[i],
        name: TEACHER_NAMES[i],
        email: `teacher.${sub.code.toLowerCase()}@${DOMAIN}`,
        password: hashed,
        role: 'teacher',
        firstLogin: false,
        deviceId: null,
        profilePhoto: null,
        lastWarningSentAt: null,
        createdAt: now,
        updatedAt: now,
    }));
    await db.collection('users').insertMany(teacherDocs);
    console.log(`👨‍🏫 ${teacherDocs.length} teachers created`);

    // ── Students per Group ─────────────────────────────────────────────────────
    const groupStudentIds = {};
    for (const group of GROUPS) {
        const names = STUDENT_NAMES[group];
        const ids = names.map(() => new ObjectId());
        groupStudentIds[group] = ids;

        const studentDocs = names.map((name, i) => {
            const firstName = name.split(' ')[0].toLowerCase();
            const roll = String(ROLL_BASES[group] + i + 1).padStart(10, '0');
            return {
                _id: ids[i],
                name,
                email: `${firstName}.${group.toLowerCase()}@${DOMAIN}`,
                password: hashed,
                role: 'student',
                rollNumber: roll,
                firstLogin: false,
                deviceId: null,
                profilePhoto: null,
                lastWarningSentAt: null,
                createdAt: now,
                updatedAt: now,
            };
        });
        await db.collection('users').insertMany(studentDocs);
        console.log(`👥 ${group}: ${names.length} students`);
    }

    // ── Classes ────────────────────────────────────────────────────────────────
    const semStart = new Date('2025-01-06');
    const semEnd = new Date('2025-06-30');
    const classMap = {}; // classId → { _id, studentIds, teacherId }

    const classDocs = [];
    for (let si = 0; si < SUBJECTS.length; si++) {
        const sub = SUBJECTS[si];
        for (const group of GROUPS) {
            const cid = new ObjectId();
            const classId = `${sub.code}-${group}`;
            classDocs.push({
                _id: cid,
                classId,
                subject: sub.name,
                teacher: teacherIds[si],
                students: groupStudentIds[group],
                semesterStartDate: semStart,
                semesterEndDate: semEnd,
                createdAt: now,
                updatedAt: now,
            });
            classMap[classId] = {
                _id: cid,
                teacherId: teacherIds[si],
                studentIds: groupStudentIds[group],
            };
        }
    }
    await db.collection('classes').insertMany(classDocs);
    console.log(`📚 ${classDocs.length} classes created`);

    // ── Sessions + Attendance ──────────────────────────────────────────────────
    const days = pastWeekdays(22);
    let totalSessions = 0, totalAtt = 0;

    for (const [classId, cls] of Object.entries(classMap)) {
        const subIdx = SUBJECTS.findIndex(s => classId.startsWith(s.code));

        const sessionDocs = days.map(day => {
            const start = new Date(day);
            start.setHours(8 + subIdx, 0, 0, 0);
            const windowEnd = new Date(start.getTime() + 15 * 60 * 1000);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            return {
                _id: new ObjectId(),
                class: cls._id,
                teacher: cls.teacherId,
                qrToken: crypto.randomBytes(16).toString('hex'),
                qrExpiresAt: windowEnd,
                attendanceWindowEnd: windowEnd,
                startTime: start,
                endTime: end,
                isActive: false,
                attendanceCount: cls.studentIds.length,
                location: { latitude: 30.7046, longitude: 76.7179, accuracy: 5 },
                createdAt: start,
                updatedAt: start,
            };
        });

        await db.collection('sessions').insertMany(sessionDocs);
        totalSessions += sessionDocs.length;

        const attDocs = [];
        for (const session of sessionDocs) {
            for (const studentId of cls.studentIds) {
                const status = randomStatus();
                attDocs.push({
                    _id: new ObjectId(),
                    session: session._id,
                    student: studentId,
                    class: cls._id,
                    status,
                    deviceId: `dev-${studentId.toString().slice(-8)}`,
                    distance: Math.floor(Math.random() * 40),
                    location: {
                        latitude: 30.7046 + (Math.random() - 0.5) * 0.001,
                        longitude: 76.7179 + (Math.random() - 0.5) * 0.001,
                    },
                    suspiciousFlag: false,
                    isManual: false,
                    markedAt: new Date(session.startTime.getTime() + Math.floor(Math.random() * 14) * 60000),
                    createdAt: session.startTime,
                    updatedAt: session.startTime,
                });
            }
        }
        await db.collection('attendances').insertMany(attDocs);
        totalAtt += attDocs.length;
    }

    console.log(`📅 ${totalSessions} sessions created`);
    console.log(`✅ ${totalAtt} attendance records created`);

    // ── Rebuild indexes (Mongoose compound unique index on session+student) ──────
    await db.collection('attendances').createIndex({ session: 1, student: 1 }, { unique: true });
    await db.collection('attendances').createIndex({ class: 1, student: 1 });

    // ── Credentials summary ────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ALL ACCOUNTS — Password: Student@123');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n TEACHERS (5):');
    SUBJECTS.forEach(s => console.log(`   teacher.${s.code.toLowerCase()}@${DOMAIN}  →  ${s.name}`));
    console.log('\n STUDENTS (50 total, sample login per group):');
    GROUPS.forEach(g => {
        const n = STUDENT_NAMES[g][0].split(' ')[0].toLowerCase();
        console.log(`   ${n}.${g.toLowerCase()}@${DOMAIN}  →  Group ${g}`);
    });
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await client.close();
    console.log('✅ Done!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Seed failed:', err.message || err);
    process.exit(1);
});
