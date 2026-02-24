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
    { code: 'BE', name: 'Backend Engineering' },
    { code: 'DM', name: 'Discrete Mathematics' },
    { code: 'CN', name: 'Computer Networks' },
    { code: 'LA', name: 'Linux Administration' },
    { code: 'DSOOPS', name: 'DSOOPS' }
];

const studentsByGroup = {
    G18: [
        { name: 'Aarav Singh', rollNumber: '2401180001' },
        { name: 'Ishita Verma', rollNumber: '2401180002' },
        { name: 'Kunal Mehta', rollNumber: '2401180003' },
        { name: 'Nisha Rao', rollNumber: '2401180004' },
        { name: 'Rohan Patel', rollNumber: '2401180005' },
        { name: 'Aditi Nair', rollNumber: '2401180006' },
        { name: 'Yash Gupta', rollNumber: '2401180007' },
        { name: 'Sneha Roy', rollNumber: '2401180008' }
    ],
    G19: [
        { name: 'Harsh Vaid', rollNumber: '2401190001' },
        { name: 'Mira Joshi', rollNumber: '2401190002' },
        { name: 'Kabir Sharma', rollNumber: '2401190003' },
        { name: 'Zoya Khan', rollNumber: '2401190004' },
        { name: 'Varun Batra', rollNumber: '2401190005' },
        { name: 'Tanya Sethi', rollNumber: '2401190006' },
        { name: 'Arjun Das', rollNumber: '2401190007' },
        { name: 'Ritika Bose', rollNumber: '2401190008' }
    ],
    G20: [
        { name: 'Siddharth Jain', rollNumber: '2401200001' },
        { name: 'Pooja Menon', rollNumber: '2401200002' },
        { name: 'Dev Patel', rollNumber: '2401200003' },
        { name: 'Neha Gill', rollNumber: '2401200004' },
        { name: 'Anika Paul', rollNumber: '2401200005' },
        { name: 'Ishan Rao', rollNumber: '2401200006' },
        { name: 'Meera Das', rollNumber: '2401200007' },
        { name: 'Rajat Sen', rollNumber: '2401200008' }
    ],
    G21: [
        { name: 'Simran Gill', rollNumber: '2401210001' },
        { name: 'Nikhil Bansal', rollNumber: '2401210002' },
        { name: 'Rhea Kapoor', rollNumber: '2401210003' },
        { name: 'Vikas Jain', rollNumber: '2401210004' },
        { name: 'Aman Suri', rollNumber: '2401210005' },
        { name: 'Neha Arora', rollNumber: '2401210006' },
        { name: 'Priya Dube', rollNumber: '2401210007' },
        { name: 'Lakshya Kohli', rollNumber: '2401210008' }
    ],
    G22: [
        { name: 'Isha Malik', rollNumber: '2401220001' },
        { name: 'Rishi Bhat', rollNumber: '2401220002' },
        { name: 'Ayesha Khan', rollNumber: '2401220003' },
        { name: 'Tarun Mehta', rollNumber: '2401220004' },
        { name: 'Naina Chopra', rollNumber: '2401220005' },
        { name: 'Aditya Jain', rollNumber: '2401220006' },
        { name: 'Pallavi Rao', rollNumber: '2401220007' },
        { name: 'Mohit Sharma', rollNumber: '2401220008' }
    ]
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

    for (let i = 0; i < 8; i += 1) {
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

const seedGroups = async () => {
    ensureUploadsDir();
    await connectDB();

    const teacherEmail = `demo.teacher@${process.env.COLLEGE_DOMAIN || 'abcuniversity.edu'}`;
    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
        teacher = await User.create({
            name: 'Demo Teacher',
            email: teacherEmail,
            password: 'Teacher@123',
            role: 'teacher',
            firstLogin: false
        });
    }

    const classRegex = new RegExp(`^(${groupIds.join('|')})-`, 'i');
    const existingClasses = await Class.find({ classId: { $regex: classRegex } });
    const existingClassIds = existingClasses.map((c) => c._id);

    if (existingClassIds.length) {
        await Attendance.deleteMany({ class: { $in: existingClassIds } });
        await Session.deleteMany({ class: { $in: existingClassIds } });
        await Class.deleteMany({ _id: { $in: existingClassIds } });
    }

    const allStudents = [];
    for (const groupId of Object.keys(studentsByGroup)) {
        for (const student of studentsByGroup[groupId]) {
            allStudents.push(student);
        }
    }

    const studentEmailMap = {};
    for (const student of allStudents) {
        const email = `${student.rollNumber}@${process.env.COLLEGE_DOMAIN || 'abcuniversity.edu'}`;
        let user = await User.findOne({ email });
        if (!user) {
            const fileName = `${student.rollNumber}.png`;
            const filePath = path.join(uploadsDir, fileName);
            try {
                await downloadImage(avatarUrlFor(student.name), filePath);
            } catch (err) {
                console.warn(`Avatar download failed for ${student.name}: ${err.message}`);
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

    for (const groupId of groupIds) {
        const groupStudents = studentsByGroup[groupId].map((student) => studentEmailMap[student.rollNumber]._id);

        for (const subject of subjects) {
            const classDoc = await Class.create({
                classId: `${groupId}-${subject.code}`,
                subject: subject.name,
                teacher: teacher._id,
                semesterStartDate: new Date(new Date().getFullYear(), 0, 10),
                semesterEndDate: new Date(new Date().getFullYear(), 5, 30),
                students: groupStudents
            });

            const sessions = await createSessions(classDoc, teacher._id);

            for (const [studentIndex, studentId] of groupStudents.entries()) {
                for (const [sessionIndex, session] of sessions.entries()) {
                    const status = statusFor(studentIndex, sessionIndex);
                    const markedAt = new Date(session.startTime.getTime() + (status === 'Late' ? 8 : 2) * 60 * 1000);

                    if (status === 'Absent') {
                        continue;
                    }

                    await Attendance.create({
                        session: session._id,
                        student: studentId,
                        class: classDoc._id,
                        status,
                        deviceId: `seed_${studentId}_${sessionIndex}_${subject.code}`,
                        distance: Math.round(Math.random() * 30),
                        location: { latitude: 30.515, longitude: 76.66 },
                        suspiciousFlag: status === 'Late',
                        isManual: false,
                        markedAt
                    });
                    session.attendanceCount += 1;
                }
            }
            await sessionSaveAll(sessions);
        }
    }

    console.log('\n✅ Group seed complete.');
    console.log('Data saved in MongoDB collections: users, classes, sessions, attendance.');
    console.log(`Profile photos saved to: ${uploadsDir}`);
    console.log('Demo student password: Student@123');
    console.log(`Subjects per group: ${subjects.map((s) => s.name).join(', ')}`);

    process.exit(0);
};

const sessionSaveAll = async (sessions) => {
    for (const session of sessions) {
        await session.save();
    }
};

seedGroups().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
