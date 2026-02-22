require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const reset = async () => {
    await connectDB();
    const db = mongoose.connection.db;

    // End all active sessions
    await db.collection('sessions').updateMany({ isActive: true }, { $set: { isActive: false, endTime: new Date() } });
    console.log('✅ All active sessions terminated');

    // Clear attendance, sessions, suspicious logs
    await db.collection('attendances').deleteMany({});
    console.log('✅ Attendance records cleared');

    await db.collection('sessions').deleteMany({});
    console.log('✅ Sessions cleared');

    await db.collection('suspiciouslogs').deleteMany({});
    console.log('✅ Suspicious logs cleared');

    console.log('\n🎉 Fresh start! Users and classes are preserved.');
    console.log('You can now start new sessions.\n');
    process.exit(0);
};

reset().catch(err => { console.error(err); process.exit(1); });
