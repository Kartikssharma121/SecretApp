const jwt = require('jsonwebtoken');

// Generate JWT token (Access Token)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '1h',
    });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '14d',
    });
};

module.exports = { generateToken, generateRefreshToken };
