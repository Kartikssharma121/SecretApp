const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();
const jwt = require('jsonwebtoken');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({}).select('+refreshToken');
    if (!user) return console.log('no user');
    console.log("Found user:", user.email, "Refresh Token:", user.refreshToken);

    // Now let's try finding the user by refresh token
    const userByToken = await User.findOne({ refreshToken: user.refreshToken });
    console.log("Found user by token?", !!userByToken);

    if (userByToken) {
        jwt.verify(user.refreshToken, process.env.JWT_SECRET, (err, decoded) => {
            console.log("JWT Verify Error:", err);
            console.log("JWT Decoded:", decoded);
        });
    }

    mongoose.connection.close();
})();
