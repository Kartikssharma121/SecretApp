const express = require('express');
const router = express.Router();
const AppConfig = require('../models/AppConfig');

/**
 * GET /api/config/version
 * Public endpoint — no auth required.
 * Returns the minimum app version required to use the app.
 * If no config document exists yet, seeds one with v1.0.0.
 */
router.get('/version', async (req, res) => {
    try {
        let config = await AppConfig.findOne();

        if (!config) {
            // Auto-seed the first config document
            config = await AppConfig.create({ minVersion: '1.0.0' });
        }

        res.json({ minVersion: config.minVersion });
    } catch (error) {
        console.error('Config route error:', error);
        res.status(500).json({ message: 'Failed to fetch app config' });
    }
});

module.exports = router;
