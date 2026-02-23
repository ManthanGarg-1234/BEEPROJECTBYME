require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const resetAll = async () => {
    await connectDB();
    const dbName = mongoose.connection.name;

    await mongoose.connection.dropDatabase();
    console.log(`✅ Database "${dbName}" dropped`);
    console.log('🎉 Fresh start! All users, classes, sessions, attendance, and logs removed.');
    process.exit(0);
};

resetAll().catch((err) => {
    console.error('Reset all failed:', err);
    process.exit(1);
});
