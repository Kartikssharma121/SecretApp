const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, gender } = req.body;

        // Validation
        if (!name || !email || !password || !gender) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        // Validate gender
        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ message: 'Invalid gender value' });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            if (user.isVerified) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // Update unverified user's registration details
            user.name = name;
            user.gender = gender;
            user.password = password; // pre-save hook will hash it on save
        } else {
            // Create new unverified user
            user = new User({
                name,
                email,
                password,
                gender,
                isVerified: false,
            });
        }

        // Generate 6-digit verification code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOTP = otp;
        user.verificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // Send verification email
        const emailText = `Your email verification code for SecretCall is: ${otp}\n\nThis code is valid for 10 minutes.`;
        const emailHtml = `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff;">
            <h2 style="color: #1a1a2e; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #52525b;">Thank you for signing up for SecretCall. Please use the verification code below to verify your email address and activate your account:</p>
            <div style="background: #f4f4f5; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 8px; margin: 24px 0; color: #1a1a2e; border: 1px solid #e4e4e7;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #71717a; line-height: 1.5;">This code is valid for 10 minutes. If you did not register for an account, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">SecretCall Anonymous Platform</p>
          </div>
        `;

        await sendEmail({
            to: user.email,
            subject: 'SecretCall Email Verification Code',
            text: emailText,
            html: emailHtml,
        });

        res.status(201).json({
            message: 'Verification code sent to your email',
            email: user.email,
            requiresVerification: true,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                // Generate and send a new OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                user.verificationOTP = otp;
                user.verificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
                await user.save();

                const emailText = `Your email verification code for SecretCall is: ${otp}\n\nThis code is valid for 10 minutes.`;
                const emailHtml = `
                  <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff;">
                    <h2 style="color: #1a1a2e; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">Verify Your Email Address</h2>
                    <p style="font-size: 16px; line-height: 1.5; color: #52525b;">It seems your email address has not been verified yet. Please use the verification code below to verify your email address and activate your account:</p>
                    <div style="background: #f4f4f5; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 8px; margin: 24px 0; color: #1a1a2e; border: 1px solid #e4e4e7;">
                      ${otp}
                    </div>
                    <p style="font-size: 14px; color: #71717a; line-height: 1.5;">This code is valid for 10 minutes.</p>
                  </div>
                `;

                await sendEmail({
                    to: user.email,
                    subject: 'SecretCall Email Verification Code',
                    text: emailText,
                    html: emailHtml,
                });

                return res.status(403).json({
                    message: 'Please verify your email address. A new code has been sent.',
                    isVerified: false,
                    email: user.email,
                });
            }

            const token = generateToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // Update online status and refresh token
            user.isOnline = true;
            user.lastSeen = Date.now();
            user.refreshToken = refreshToken;
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                token,
                refreshToken,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        console.log("Backend received refresh token:", refreshToken);
        const user = await User.findOne({ refreshToken }).select('+refreshToken');
        if (!user) {
            console.log("User not found for this refresh token in DB");
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        console.log("User found, validating JWT...");
        jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.log("JWT Verify failed:", err.message);
                return res.status(403).json({ message: 'Refresh token expired' });
            }

            console.log("Token verified successfully, generating new tokens...");

            const token = generateToken(user._id);
            res.json({ token, refreshToken });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.refreshToken = null;
            user.isOnline = false;
            user.lastSeen = Date.now();
            await user.save();
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide email and verification code' });
        }

        // Find user and select secret fields
        const user = await User.findOne({ email }).select('+verificationOTP +verificationOTPExpires');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        if (user.verificationOTP !== otp || user.verificationOTPExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Mark as verified
        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        user.refreshToken = refreshToken;

        await user.save();

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            token,
            refreshToken,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOTP = otp;
        user.verificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // Send email
        const emailText = `Your email verification code for SecretCall is: ${otp}\n\nThis code is valid for 10 minutes.`;
        const emailHtml = `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff;">
            <h2 style="color: #1a1a2e; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #52525b;">Please use the new verification code below to verify your email address and activate your account:</p>
            <div style="background: #f4f4f5; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 8px; margin: 24px 0; color: #1a1a2e; border: 1px solid #e4e4e7;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #71717a; line-height: 1.5;">This code is valid for 10 minutes. If you did not request a code, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">SecretCall Anonymous Platform</p>
          </div>
        `;

        await sendEmail({
            to: user.email,
            subject: 'New SecretCall Verification Code',
            text: emailText,
            html: emailHtml,
        });

        res.status(200).json({ message: 'New verification code sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    refreshToken,
    logoutUser,
    verifyEmail,
    resendOTP,
};
