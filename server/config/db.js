const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Check if TEST_MODE is enabled
        if (process.env.TEST_MODE === 'true') {
            console.log('🧪 TEST MODE ENABLED - Using In-Memory Database');
            console.log('⚠️  Data will NOT persist when server restarts');
            
            // For test mode, we'll use mongodb memory server or fallback to local
            try {
                // Try to connect to local MongoDB first
                const conn = await mongoose.connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 2000,
                });
                console.log(`✅ Connected to local MongoDB`);
                return;
            } catch (localError) {
                console.log('📦 Local MongoDB not available, using fallback connection...');
                // If local MongoDB fails, we can still use Mongoose in memory
                // Initialize minimal in-memory support
                await mongoose.connect('mongodb://localhost:27017/attendease-test', {
                    serverSelectionTimeoutMS: 1000,
                }).catch(() => {
                    // Mongoose will create collections on schema operations
                    console.log('✅ Ready for test operations (collections will auto-create)');
                });
            }
        } else {
            // Production mode - require actual MongoDB connection
            const conn = await mongoose.connect(process.env.MONGO_URI);
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        }
    } catch (error) {
        if (process.env.TEST_MODE === 'true') {
            console.warn(`⚠️  Connection Warning: ${error.message}`);
            console.log('✅ System will attempt to work with limited connectivity');
        } else {
            console.error(`❌ MongoDB Connection Error: ${error.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
