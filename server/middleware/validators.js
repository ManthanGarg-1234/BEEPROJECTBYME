const { body } = require('express-validator');

const COLLEGE_DOMAIN = process.env.COLLEGE_DOMAIN || 'abcuniversity.edu';

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .custom((value, { req }) => {
            const domainPattern = new RegExp(`^[^@\s]+@${COLLEGE_DOMAIN.replace('.', '\.')}$`);
            if (!domainPattern.test(value)) {
                throw new Error(`Email must be at ${COLLEGE_DOMAIN}`);
            }

            const localPart = value.split('@')[0];
            const rollPattern = /^\d{10}$/;

            if (req.body?.role === 'student' && !rollPattern.test(localPart)) {
                if (!rollPattern.test(req.body?.rollNumber || '')) {
                    throw new Error(`Student email must be 10 digits or provide roll number`);
                }
            }
            return true;
        }),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least 1 lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least 1 special character'),

    body('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),

    body('rollNumber')
        .custom((value, { req }) => {
            const rollPattern = /^\d{10}$/;
            const emailLocal = (req.body?.email || '').split('@')[0];

            if (req.body?.role === 'student' && !rollPattern.test(emailLocal)) {
                if (!rollPattern.test(value || '')) {
                    throw new Error('Roll number is required for students when email is not 10 digits');
                }
            }

            if (value && !rollPattern.test(value)) {
                throw new Error('Roll number must be exactly 10 digits');
            }
            return true;
        })
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('password')
        .notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least 1 lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least 1 special character')
];

const classValidation = [
    body('classId')
        .trim()
        .notEmpty().withMessage('Class ID is required')
        .isLength({ min: 3, max: 20 }).withMessage('Class ID must be 3-20 characters'),

    body('subject')
        .trim()
        .notEmpty().withMessage('Subject name is required'),

    body('semesterStartDate')
        .notEmpty().withMessage('Semester start date is required')
        .isISO8601().withMessage('Invalid date format'),

    body('semesterEndDate')
        .notEmpty().withMessage('Semester end date is required')
        .isISO8601().withMessage('Invalid date format')
];

const sessionValidation = [
    body('classId')
        .notEmpty().withMessage('Class ID is required'),

    body('attendanceWindow')
        .optional()
        .isInt({ min: 1, max: 30 }).withMessage('Attendance window must be between 1-30 minutes'),

    body('latitude')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

    body('longitude')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

    body('accuracy')
        .optional()
        .isFloat({ min: 0, max: 1000 }).withMessage('Invalid GPS accuracy')
];

const attendanceValidation = [
    body('qrToken')
        .notEmpty().withMessage('QR token is required'),

    body('latitude')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

    body('longitude')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

    body('deviceId')
        .notEmpty().withMessage('Device ID is required'),

    body('accuracy')
        .optional()
        .isFloat({ min: 0, max: 1000 }).withMessage('Invalid GPS accuracy')
];

module.exports = {
    registerValidation,
    loginValidation,
    changePasswordValidation,
    classValidation,
    sessionValidation,
    attendanceValidation
};
