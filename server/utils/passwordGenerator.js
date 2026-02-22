const crypto = require('crypto');

/**
 * Generate a strong temporary password meeting all requirements:
 * - Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const generateTempPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*?';

    // Ensure at least one of each type
    let password = '';
    password += upper[crypto.randomInt(upper.length)];
    password += lower[crypto.randomInt(lower.length)];
    password += digits[crypto.randomInt(digits.length)];
    password += special[crypto.randomInt(special.length)];

    // Fill remaining with random chars
    const all = upper + lower + digits + special;
    for (let i = 0; i < 8; i++) {
        password += all[crypto.randomInt(all.length)];
    }

    // Shuffle the password
    return password
        .split('')
        .sort(() => crypto.randomInt(3) - 1)
        .join('');
};

module.exports = { generateTempPassword };
