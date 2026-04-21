// MongoDB Atlas Setup Helper - Automated Configuration
// This script guides you through MongoDB Atlas setup or uses fallback

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
});

async function setupMongoDB() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     MongoDB Setup - Smart Attendance System            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Choose setup option:\n');
    console.log('1. Use Existing MongoDB Atlas URI (paste from account)');
    console.log('2. Create NEW MongoDB Atlas Account (FREE - recommended)');
    console.log('3. Use Local MongoDB (requires installation)');
    console.log('4. Use TEST MODE (in-memory, for testing only)\n');

    const choice = await question('Enter your choice (1-4): ');

    const envPath = path.join(__dirname, '.env');

    switch (choice) {
        case '1':
            await useExistingAtlas(envPath);
            break;
        case '2':
            await createNewAtlas(envPath);
            break;
        case '3':
            await useLocalMongoDB(envPath);
            break;
        case '4':
            await useTestMode(envPath);
            break;
        default:
            console.log('❌ Invalid choice');
            rl.close();
            process.exit(1);
    }
}

async function useExistingAtlas(envPath) {
    console.log('\n📋 MongoDB Atlas URI Setup\n');
    console.log('Your URI should look like:');
    console.log('mongodb+srv://username:password@cluster.mongodb.net/attendease\n');

    const uri = await question('Paste your MongoDB Atlas URI: ');

    if (!uri.includes('mongodb+srv://')) {
        console.log('❌ Invalid URI format');
        rl.close();
        process.exit(1);
    }

    updateEnv(envPath, { MONGO_URI: uri });
    console.log('\n✅ MongoDB URI configured successfully!');
    console.log('Next step: Run "node test-mongo.js" to verify connection\n');
    
    rl.close();
}

async function createNewAtlas(envPath) {
    console.log('\n🚀 Creating MongoDB Atlas Account (FREE)\n');
    console.log('Follow these steps:');
    console.log('1. Go to: https://www.mongodb.com/cloud/atlas');
    console.log('2. Click "Sign Up" or "Try Free"');
    console.log('3. Sign up with email');
    console.log('4. Click "Build a Database"');
    console.log('5. Choose "FREE" tier');
    console.log('6. Select region (choose close to you)');
    console.log('7. Click "Create"');
    console.log('8. Wait for cluster to create (2-3 minutes)');
    console.log('9. Click "Connect"');
    console.log('10. Choose "Drivers"');
    console.log('11. Copy the connection string\n');

    const uri = await question('Paste your MongoDB Atlas connection string: ');

    if (!uri.includes('mongodb+srv://')) {
        console.log('❌ Invalid URI format');
        rl.close();
        process.exit(1);
    }

    updateEnv(envPath, { MONGO_URI: uri });
    console.log('\n✅ MongoDB Atlas configured!');
    console.log('Next: Run "node test-mongo.js" to verify\n');
    
    rl.close();
}

async function useLocalMongoDB(envPath) {
    console.log('\n💻 Local MongoDB Setup\n');
    console.log('Prerequisites:');
    console.log('1. MongoDB must be installed on your system');
    console.log('2. MongoDB service must be running (mongod)\n');

    console.log('If not installed:');
    console.log('  Windows: Download from mongodb.com/try/download/community');
    console.log('  Or: brew install mongodb-community (macOS)\n');

    const confirmed = await question('Continue with local MongoDB? (yes/no): ');

    if (confirmed.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled');
        rl.close();
        process.exit(1);
    }

    updateEnv(envPath, { MONGO_URI: 'mongodb://localhost:27017/attendease' });
    console.log('\n✅ Local MongoDB configured!');
    console.log('⚠️  Make sure MongoDB is running: mongod');
    console.log('Next: Run "node test-mongo.js" to verify\n');
    
    rl.close();
}

async function useTestMode(envPath) {
    console.log('\n🧪 Test Mode (In-Memory Database)\n');
    console.log('⚠️  WARNING: This is for testing only!');
    console.log('   Data will NOT persist when server restarts\n');

    const confirmed = await question('Enable test mode? (yes/no): ');

    if (confirmed.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled');
        rl.close();
        process.exit(1);
    }

    updateEnv(envPath, { 
        MONGO_URI: 'mongodb://localhost:27017/attendease',
        TEST_MODE: 'true'
    });

    console.log('\n✅ Test mode enabled!');
    console.log('   In-memory database will be used');
    console.log('   Data persists during session only\n');
    
    rl.close();
}

function updateEnv(filePath, updates) {
    let envContent = '';

    if (fs.existsSync(filePath)) {
        envContent = fs.readFileSync(filePath, 'utf-8');
    } else {
        envContent = require('fs').readFileSync(
            path.join(__dirname, '.env.example'),
            'utf-8'
        );
    }

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    }

    fs.writeFileSync(filePath, envContent);
}

setupMongoDB().catch(err => {
    console.error('❌ Setup error:', err.message);
    rl.close();
    process.exit(1);
});
