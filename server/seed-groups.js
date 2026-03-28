require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const connectDB = require('./config/db');
const User = require('./models/User');
const Class = require('./models/Class');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');

const uploadsDir = path.join(__dirname, 'uploads', 'profiles');

const groupIds = ['G18', 'G19', 'G20', 'G21', 'G22'];

const subjects = [
    { code: 'BE',     name: 'Backend Engineering',    teacherName: 'Dr. Ramesh Gupta',    teacherEmail: 'ramesh.gupta@chitkara.edu' },
    { code: 'DM',     name: 'Discrete Mathematics',   teacherName: 'Dr. Sunita Sharma',   teacherEmail: 'sunita.sharma@chitkara.edu' },
    { code: 'CN',     name: 'Computer Networks',      teacherName: 'Dr. Amit Verma',      teacherEmail: 'amit.verma@chitkara.edu' },
    { code: 'LA',     name: 'Linux Administration',   teacherName: 'Dr. Priya Mehta',     teacherEmail: 'priya.mehta@chitkara.edu' },
    { code: 'DSOOPS', name: 'DSOOPS',                 teacherName: 'Dr. Naveen Rao',      teacherEmail: 'naveen.rao@chitkara.edu' },
];

const studentsByGroup = {
    G18: [
        { name: 'Aarav Singh',      rollNumber: '2401180001' },
        { name: 'Ishita Verma',     rollNumber: '2401180002' },
        { name: 'Kunal Mehta',      rollNumber: '2401180003' },
        { name: 'Nisha Rao',        rollNumber: '2401180004' },
        { name: 'Rohan Patel',      rollNumber: '2401180005' },
        { name: 'Aditi Nair',       rollNumber: '2401180006' },
        { name: 'Yash Gupta',       rollNumber: '2401180007' },
        { name: 'Sneha Roy',        rollNumber: '2401180008' },
        { name: 'Manav Joshi',      rollNumber: '2401180009' },
        { name: 'Pooja Kapoor',     rollNumber: '2401180010' },
    ],
    G19: [
        { name: 'Harsh Vaid',       rollNumber: '2401190001' },
        { name: 'Mira Joshi',       rollNumber: '2401190002' },
        { name: 'Kabir Sharma',     rollNumber: '2401190003' },
        { name: 'Zoya Khan',        rollNumber: '2401190004' },
        { name: 'Varun Batra',      rollNumber: '2401190005' },
        { name: 'Tanya Sethi',      rollNumber: '2401190006' },
        { name: 'Arjun Das',        rollNumber: '2401190007' },
        { name: 'Ritika Bose',      rollNumber: '2401190008' },
        { name: 'Sahil Kumar',      rollNumber: '2401190009' },
        { name: 'Divya Pillai',     rollNumber: '2401190010' },
    ],
    G20: [
        { name: 'Siddharth Jain',   rollNumber: '2401200001' },
        { name: 'Pooja Menon',      rollNumber: '2401200002' },
        { name: 'Dev Patel',        rollNumber: '2401200003' },
        { name: 'Neha Gill',        rollNumber: '2401200004' },
        { name: 'Anika Paul',       rollNumber: '2401200005' },
        { name: 'Ishan Rao',        rollNumber: '2401200006' },
        { name: 'Meera Das',        rollNumber: '2401200007' },
        { name: 'Rajat Sen',        rollNumber: '2401200008' },
        { name: 'Priyank Shah',     rollNumber: '2401200009' },
        { name: 'Anjali Mishra',    rollNumber: '2401200010' },
    ],
    G21: [
        { name: 'Simran Gill',      rollNumber: '2401210001' },
        { name: 'Nikhil Bansal',    rollNumber: '2401210002' },
        { name: 'Rhea Kapoor',      rollNumber: '2401210003' },
        { name: 'Vikas Jain',       rollNumber: '2401210004' },
        { name: 'Aman Suri',        rollNumber: '2401210005' },
        { name: 'Neha Arora',       rollNumber: '2401210006' },
        { name: 'Priya Dube',       rollNumber: '2401210007' },
        { name: 'Lakshya Kohli',    rollNumber: '2401210008' },
        { name: 'Tanveer Ansari',   rollNumber: '2401210009' },
        { name: 'Renu Chauhan',     rollNumber: '2401210010' },
    ],
    G22: [
        { name: 'Isha Malik',       rollNumber: '2401220001' },
        { name: 'Rishi Bhat',       rollNumber: '2401220002' },
        { name: 'Ayesha Khan',      rollNumber: '2401220003' },
        { name: 'Tarun Mehta',      rollNumber: '2401220004' },
        { name: 'Naina Chopra',     rollNumber: '2401220005' },
        { name: 'Aditya Jain',      rollNumber: '2401220006' },
        { name: 'Pallavi Rao',      rollNumber: '2401220007' },
        { name: 'Mohit Sharma',     rollNumber: '2401220008' },
        { name: 'Sanya Bedi',       rollNumber: '2401220009' },
        { name: 'Karan Luthra',     rollNumber: '2401220010' },
    ],
};

const ensureUploadsDir = () => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
};

const downloadImage = (url, filePath) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            file.close();
            fs.unlink(filePath, () => {});
            reject(new Error(`Failed to download image: ${response.statusCode}`));
            return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
        file.close();
        fs.unlink(filePath, () => {});
        reject(err);
    });
});

const avatarUrlFor = (name) => {
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/initials/png?seed=${seed}&size=256`;
};

const statusFor = (studentIndex, sessionIndex) => {
    const value = (studentIndex * 7 + sessionIndex * 3) % 10;
    if (value < 6) return 'Present';
    if (value < 8) return 'Late';
    return 'Absent';
};

const createSessions = async (classDoc, teacherId) => {
    const sessions = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 28);

    for (let i = 0; i < 10; i += 1) {
        const startTime = new Date(baseDate);
        startTime.setDate(baseDate.getDate() + i * 3);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const attendanceWindowEnd = new Date(startTime.getTime() + 10 * 60 * 1000);
        const qrExpiresAt = new Date(startTime.getTime() + 60 * 1000);

        const session = await Session.create({
            class: classDoc._id,
            teacher: teacherId,
            qrToken: crypto.randomBytes(12).toString('hex'),
            qrExpiresAt,
            startTime,
            endTime,
            attendanceWindowEnd,
            location: { latitude: 30.515, longitude: 76.66, accuracy: 10 },
            isActive: false,
            attendanceCount: 0
        });
        sessions.push(session);
    }

    return sessions;
};

const sessionSaveAll = async (sessions) => {
    for (const session of sessions) {
        await Session.updateOne({ _id: session._id }, { $set: { attendanceCount: session.attendanceCount } });
    }
};

const seedGroups = async () => {
    ensureUploadsDir();
    await connectDB();

    // ── 1. Remove old demo teacher ─────────────────────────────────────
    const demoDomain = process.env.COLLEGE_DOMAIN || 'abcuniversity.edu';
    const demoTeacherEmail = `demo.teacher@${demoDomain}`;
    const demoTeacher = await User.findOne({ email: demoTeacherEmail });
    if (demoTeacher) {
        // Remove classes/sessions/attendance owned by demo teacher
        const demoClasses = await Class.find({ teacher: demoTeacher._id });
        const demoClassIds = demoClasses.map(c => c._id);
        if (demoClassIds.length) {
            await Attendance.deleteMany({ class: { $in: demoClassIds } });
            await Session.deleteMany({ class: { $in: demoClassIds } });
            await Class.deleteMany({ _id: { $in: demoClassIds } });
        }
        await User.deleteOne({ _id: demoTeacher._id });
        console.log('🗑️  Removed demo teacher:', demoTeacherEmail);
    }

    // ── 2. Remove old demo students (abcuniversity.edu domain) ────────
    const demoStudents = await User.find({ email: { $regex: `@${demoDomain}$` }, role: 'student' });
    if (demoStudents.length) {
        await User.deleteMany({ email: { $regex: `@${demoDomain}$` }, role: 'student' });
        console.log(`🗑️  Removed ${demoStudents.length} demo student(s) with @${demoDomain}`);
    }

    // ── 3. Remove all existing G18–G22 classes/sessions/attendance ────
    const classRegex = new RegExp(`^(${groupIds.join('|')})-`, 'i');
    const existingClasses = await Class.find({ classId: { $regex: classRegex } });
    const existingClassIds = existingClasses.map(c => c._id);
    if (existingClassIds.length) {
        await Attendance.deleteMany({ class: { $in: existingClassIds } });
        await Session.deleteMany({ class: { $in: existingClassIds } });
        await Class.deleteMany({ _id: { $in: existingClassIds } });
        console.log(`🗑️  Cleared ${existingClasses.length} existing G18-G22 classes`);
    }

    // ── 4. Create/find 5 subject teachers ─────────────────────────────
    const teacherMap = {};
    for (const subject of subjects) {
        let teacher = await User.findOne({ email: subject.teacherEmail });
        if (!teacher) {
            teacher = await User.create({
                name: subject.teacherName,
                email: subject.teacherEmail,
                password: 'Teacher@123',
                role: 'teacher',
                firstLogin: false
            });
            console.log(`👨‍🏫 Created teacher: ${subject.teacherName} (${subject.teacherEmail})`);
        } else {
            console.log(`👨‍🏫 Teacher already exists: ${subject.teacherEmail}`);
        }
        teacherMap[subject.code] = teacher;
    }

    // ── 5. Create/find 10 students per group ──────────────────────────
    const allStudents = Object.values(studentsByGroup).flat();
    const studentEmailMap = {};

    for (const student of allStudents) {
        const firstName = student.name.split(' ')[0].toLowerCase();
        const email = `${firstName}.${student.rollNumber}@chitkara.edu`;
        let user = await User.findOne({ email });
        if (!user) {
            const fileName = `${student.rollNumber}.png`;
            const filePath = path.join(uploadsDir, fileName);
            try {
                await downloadImage(avatarUrlFor(student.name), filePath);
            } catch (err) {
                console.warn(`  Avatar download failed for ${student.name}: ${err.message}`);
            }

            user = await User.create({
                name: student.name,
                email,
                password: 'Student@123',
                role: 'student',
                rollNumber: student.rollNumber,
                profilePhoto: fs.existsSync(filePath) ? fileName : null,
                firstLogin: false
            });
        }
        studentEmailMap[student.rollNumber] = user;
    }

    // ── 6. Create classes, sessions, attendance ────────────────────────
    for (const groupId of groupIds) {
        const groupStudentIds = studentsByGroup[groupId].map(s => studentEmailMap[s.rollNumber]._id);

        for (const subject of subjects) {
            const teacher = teacherMap[subject.code];
            const classDoc = await Class.create({
                classId: `${groupId}-${subject.code}`,
                subject: subject.name,
                teacher: teacher._id,
                semesterStartDate: new Date(new Date().getFullYear(), 0, 10),
                semesterEndDate: new Date(new Date().getFullYear(), 5, 30),
                students: groupStudentIds
            });

            const sessions = await createSessions(classDoc, teacher._id);

            for (const [studentIndex, studentId] of groupStudentIds.entries()) {
                for (const [sessionIndex, session] of sessions.entries()) {
                    const status = statusFor(studentIndex, sessionIndex);
                    if (status === 'Absent') continue;

                    const markedAt = new Date(session.startTime.getTime() + (status === 'Late' ? 8 : 2) * 60 * 1000);
                    await Attendance.create({
                        session: session._id,
                        student: studentId,
                        class: classDoc._id,
                        status,
                        deviceId: `seed_${studentId}_${sessionIndex}_${subject.code}`,
                        distance: Math.round(Math.random() * 30),
                        location: { latitude: 30.515, longitude: 76.66 },
                        suspiciousFlag: false,
                        isManual: false,
                        markedAt
                    });
                    session.attendanceCount += 1;
                }
            }
            await sessionSaveAll(sessions);
            console.log(`  ✅ ${groupId}-${subject.code} seeded (${groupStudentIds.length} students, 10 sessions)`);
        }
    }

    // ── 7. Print summary ──────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Seed complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 TEACHERS (Password: Teacher@123)');
    for (const subject of subjects) {
        console.log(`   ${subject.teacherName.padEnd(22)} ${subject.teacherEmail.padEnd(35)} → teaches ${subject.code} for all groups`);
    }
    console.log('\n📋 STUDENTS (Password: Student@123)');
    for (const [groupId, students] of Object.entries(studentsByGroup)) {
        console.log(`\n  Group ${groupId}:`);
        for (const s of students) {
            const firstName = s.name.split(' ')[0].toLowerCase();
            const email = `${firstName}.${s.rollNumber}@chitkara.edu`;
            console.log(`   ${s.name.padEnd(20)} ${email}`);
        }
    }
    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
};

seedGroups().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
