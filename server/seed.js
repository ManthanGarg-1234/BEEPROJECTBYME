require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
    await connectDB();

    // Teacher
    const teacherExists = await User.findOne({ email: '1000000001@abcuniversity.edu' });
    if (!teacherExists) {
        await User.create({
            name: 'Dr. Sharma',
            email: '1000000001@abcuniversity.edu',
            password: 'Teacher@123',
            role: 'teacher',
            rollNumber: '1000000001',
            firstLogin: false
        });
        console.log('✅ Teacher created');
    } else {
        console.log('⚡ Teacher already exists');
    }

    // Student
    const studentExists = await User.findOne({ email: '2401020101@abcuniversity.edu' });
    if (!studentExists) {
        await User.create({
            name: 'Rahul Kumar',
            email: '2401020101@abcuniversity.edu',
            password: 'Student@123',
            role: 'student',
            rollNumber: '2401020101',
            firstLogin: false
        });
        console.log('✅ Student created');
    } else {
        console.log('⚡ Student already exists');
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  TEACHER LOGIN                                  ║');
    console.log('║  Email:    1000000001@abcuniversity.edu          ║');
    console.log('║  Password: Teacher@123                           ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  STUDENT LOGIN                                  ║');
    console.log('║  Email:    2401020101@abcuniversity.edu          ║');
    console.log('║  Password: Student@123                           ║');
    console.log('╚══════════════════════════════════════════════════╝');

    process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
