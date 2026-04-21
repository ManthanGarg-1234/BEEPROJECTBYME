const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Testing MongoDB Atlas connection...');
        console.log('URI:', process.env.MONGO_URI.substring(0, 50) + '...');
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Atlas Connected Successfully!');
        
        // List databases
        const admin = mongoose.connection.getClient().db('admin');
        const databases = await admin.admin().listDatabases();
        console.log('Available databases:', databases.databases.map(db => db.name));
        
        await mongoose.disconnect();
        console.log('✅ Connection test completed');
        process.exit(0);
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
        console.log('\nSetup Options:');
        console.log('1. Check MongoDB Atlas credentials in server/.env');
        console.log('2. Use local MongoDB with: MONGO_URI=mongodb://localhost:27017/attendease');
        console.log('3. Use Docker: docker run -d -p 27017:27017 mongo');
        process.exit(1);
    }
}

testConnection();
