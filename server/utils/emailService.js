const nodemailer = require('nodemailer');

// Email is disabled when SMTP credentials are not configured
const EMAIL_ENABLED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
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

    if (!EMAIL_ENABLED) return false;

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

    if (!EMAIL_ENABLED) return false;

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

/**
 * Send low attendance warning email with professional HTML template
 * Used by the teacher-triggered notification module
 * 
 * @param {Object} options
 * @param {string} options.toEmail - Actual email address to deliver to
 * @param {string} options.studentName - Student's full name
 * @param {string} options.subject - Subject/course name
 * @param {number} options.attendance - Current attendance percentage
 * @param {number} options.classesAttended - Number of classes attended
 * @param {number} options.totalClasses - Total number of classes
 * @param {string} options.teacherName - Teacher's full name
 * @param {string} options.teacherInstitutionalEmail - Teacher's institutional email for signature
 * @param {string} options.studentInstitutionalEmail - Student's institutional email for display
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
const sendLowAttendanceWarning = async (options) => {
    const {
        toEmail,
        studentName,
        subject,
        attendance,
        classesAttended,
        totalClasses,
        teacherName,
        teacherInstitutionalEmail,
        studentInstitutionalEmail
    } = options;

    // Dynamic warning level
    const isCritical = attendance < 50;
    const isSerious = attendance < 65;
    const accentColor = isCritical ? '#dc2626' : isSerious ? '#f97316' : '#f59e0b';
    const accentGlow = isCritical ? 'rgba(220,38,38,0.3)' : isSerious ? 'rgba(249,115,22,0.3)' : 'rgba(245,158,11,0.3)';
    const statusLabel = isCritical ? 'CRITICAL' : isSerious ? 'SERIOUS' : 'WARNING';
    const statusEmoji = isCritical ? '🚨' : isSerious ? '⚠️' : '📢';

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; max-width: 620px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(148,163,184,0.15);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6366f1 100%); padding: 32px 30px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">📋 AttendEase</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;">Low Attendance Warning</p>
      </div>

      <!-- Status Badge -->
      <div style="text-align: center; padding: 24px 30px 0;">
        <span style="display: inline-block; padding: 6px 20px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 1px; color: ${accentColor}; background: rgba(255,255,255,0.05); border: 1px solid ${accentColor}; box-shadow: 0 0 15px ${accentGlow};">
          ${statusEmoji} ${statusLabel}
        </span>
      </div>

      <!-- Body -->
      <div style="padding: 28px 30px;">
        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6; margin: 0 0 20px;">
          Dear <strong style="color: #ffffff;">${studentName}</strong>,
        </p>

        <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 24px;">
          Your attendance in <strong style="color: #e2e8f0;">${subject}</strong> has fallen below the required <strong style="color: #e2e8f0;">75%</strong> threshold.
        </p>

        <!-- Stats Card -->
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(148,163,184,0.15); border-radius: 12px; padding: 20px 24px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid rgba(148,163,184,0.1);">Subject</td>
              <td style="padding: 10px 0; color: #e2e8f0; font-weight: 600; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(148,163,184,0.1);">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid rgba(148,163,184,0.1);">Current Attendance</td>
              <td style="padding: 10px 0; font-weight: 800; font-size: 18px; text-align: right; color: ${accentColor}; border-bottom: 1px solid rgba(148,163,184,0.1);">${attendance.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid rgba(148,163,184,0.1);">Classes Attended</td>
              <td style="padding: 10px 0; color: #e2e8f0; font-weight: 600; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(148,163,184,0.1);">${classesAttended} / ${totalClasses}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Required Attendance</td>
              <td style="padding: 10px 0; color: #22c55e; font-weight: 600; font-size: 14px; text-align: right;">75%</td>
            </tr>
          </table>
        </div>

        <!-- Warning Message -->
        <div style="background: rgba(245,158,11,0.08); border-left: 3px solid ${accentColor}; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 0 0 28px;">
          <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
            Please improve your attendance immediately to meet the academic requirements. Continued low attendance may result in academic penalties.
          </p>
        </div>

        <!-- Signature -->
        <div style="border-top: 1px solid rgba(148,163,184,0.1); padding-top: 20px; margin-top: 8px;">
          <p style="margin: 0 0 4px; font-size: 14px; color: #e2e8f0;">Regards,</p>
          <p style="margin: 0 0 2px; font-size: 15px; font-weight: 700; color: #ffffff;">${teacherName}</p>
          <p style="margin: 0 0 2px; font-size: 13px; color: #94a3b8;">Faculty of ${subject}</p>
          <p style="margin: 0; font-size: 12px; color: #64748b;">${teacherInstitutionalEmail}</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: rgba(255,255,255,0.02); padding: 16px 30px; text-align: center; border-top: 1px solid rgba(148,163,184,0.08);">
        <p style="margin: 0; font-size: 11px; color: #475569;">
          This is an automated notification from <strong>AttendEase</strong> — Smart Attendance Management System
        </p>
      </div>
    </div>
  `;

    if (!EMAIL_ENABLED) {
        console.warn('[EMAIL] SMTP not configured — skipping send to', toEmail);
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        const transport = getTransporter();
        const result = await transport.sendMail({
            from: `"${teacherName} via AttendEase" <${process.env.SMTP_USER}>`,
            to: toEmail,
            replyTo: teacherInstitutionalEmail,
            subject: `${statusEmoji} Low Attendance Warning — ${subject}`,
            html
        });
        return { success: true, messageId: result.messageId || result.response };
    } catch (error) {
        console.error('[EMAIL] Send failed to', toEmail, ':', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendWarningEmail, sendWelcomeEmail, sendLowAttendanceWarning, getTransporter, EMAIL_ENABLED };

