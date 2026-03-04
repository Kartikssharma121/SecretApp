const mongoose = require('mongoose');

const AppConfigSchema = new mongoose.Schema({
    minVersion: {
        type: String,
        required: true,
        default: '1.0.0',
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('AppConfig', AppConfigSchema);
