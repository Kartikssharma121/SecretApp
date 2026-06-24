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

router.get('/smtp-check', async (req, res) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME } = process.env;
    res.json({
        SMTP_HOST: SMTP_HOST || null,
        SMTP_PORT: SMTP_PORT || null,
        SMTP_USER: SMTP_USER || null,
        SMTP_PASS_EXISTS: !!SMTP_PASS,
        SMTP_PASS_LENGTH: SMTP_PASS ? SMTP_PASS.length : 0,
        SMTP_FROM_EMAIL: SMTP_FROM_EMAIL || null,
        SMTP_FROM_NAME: SMTP_FROM_NAME || null,
        NODE_ENV: process.env.NODE_ENV || null
    });
});

router.get('/smtp-test', async (req, res) => {
    const sendEmail = require('../utils/sendEmail');
    try {
        const result = await sendEmail({
            to: 'kartikssharma121@gmail.com',
            subject: 'SecretCall Live SMTP Diagnostic Test',
            text: 'This is a test email sent from the live SecretCall server to diagnose SMTP functionality.'
        });
        res.json({ result });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

module.exports = router;
