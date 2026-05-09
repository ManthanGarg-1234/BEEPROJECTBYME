require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        await transporter.verify();
        console.log('\n✅ SMTP connection SUCCESS — credentials are valid!');
    } catch (err) {
        console.log('\n❌ SMTP connection FAILED:', err.message);
    }
    process.exit(0);
}
test();
