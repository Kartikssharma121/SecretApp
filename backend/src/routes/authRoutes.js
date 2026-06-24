const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, refreshToken, logoutUser, verifyEmail, resendOTP } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.get('/me', protect, getMe);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logoutUser);

module.exports = router;
