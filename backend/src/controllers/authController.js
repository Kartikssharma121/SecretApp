const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');

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

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate gender
        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ message: 'Invalid gender value' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            gender,
        });

        if (user) {
            const token = generateToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            user.refreshToken = refreshToken;
            // Since we use create, we didn't save the refresh token yet, so save it now.
            // But we don't want to re-trigger password hash, so be careful.
            // Actually, because we just created it, we can update it directly:
            await User.findByIdAndUpdate(user._id, { refreshToken });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                token,
                refreshToken,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
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


module.exports = {
    registerUser,
    loginUser,
    getMe,
    refreshToken,
    logoutUser,
};
