const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return transporter;
};

/**
 * Send attendance warning email
 */
const sendWarningEmail = async (studentEmail, studentName, data) => {
    const { subject, percentage, warningLevel } = data;

    const levelColor = warningLevel === 'Critical' ? '#dc2626' : '#f59e0b';
    const levelEmoji = warningLevel === 'Critical' ? '🚨' : '⚠️';

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">📋 AttendEase</h1>
        <p style="margin: 5px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Attendance Warning Notification</p>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px;">Dear <strong>${studentName}</strong>,</p>
        <div style="background: rgba(255,255,255,0.05); border-left: 4px solid ${levelColor}; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: bold;">${levelEmoji} ${warningLevel} Warning</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #aaa;">Subject:</td>
              <td style="padding: 6px 0; font-weight: bold;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #aaa;">Attendance:</td>
              <td style="padding: 6px 0; font-weight: bold; color: ${levelColor};">${percentage.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #aaa;">Required:</td>
              <td style="padding: 6px 0; font-weight: bold;">75%</td>
            </tr>
          </table>
        </div>
        <p style="color: #aaa; font-size: 14px; line-height: 1.6;">
          Your attendance in <strong>${subject}</strong> is below the required threshold. 
          Please ensure regular attendance to avoid academic penalties.
        </p>
      </div>
      <div style="background: rgba(255,255,255,0.03); padding: 15px 30px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">This is an automated notification from AttendEase</p>
      </div>
    </div>
  `;

    try {
        const transport = getTransporter();
        await transport.sendMail({
            from: `"AttendEase" <${process.env.SMTP_USER}>`,
            to: studentEmail,
            subject: `${levelEmoji} Attendance ${warningLevel} - ${subject}`,
            html
        });
        return true;
    } catch (error) {
        console.error('Email send failed:', error.message);
        return false;
    }
};

/**
 * Send welcome email with temporary credentials
 */
const sendWelcomeEmail = async (email, name, tempPassword) => {
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">📋 AttendEase</h1>
        <p style="margin: 5px 0 0; color: rgba(255,255,255,0.85);">Welcome to AttendEase!</p>
      </div>
      <div style="padding: 30px;">
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your account has been created. Here are your credentials:</p>
        <div style="background: rgba(255,255,255,0.08); padding: 15px 20px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p style="color: #f59e0b;">⚠️ Please change your password after first login.</p>
      </div>
    </div>
  `;

    try {
        const transport = getTransporter();
        await transport.sendMail({
            from: `"AttendEase" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🎓 Welcome to AttendEase - Your Account Credentials',
            html
        });
        return true;
    } catch (error) {
        console.error('Welcome email failed:', error.message);
        return false;
    }
};

module.exports = { sendWarningEmail, sendWelcomeEmail };
