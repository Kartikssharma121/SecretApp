const nodemailer = require('nodemailer');

// Cache the transporter globally to reuse SMTP connections
let transporterInstance = null;

/**
 * Send email helper using Nodemailer and SMTP.
 * Falls back to console logging if credentials are not configured.
 */
const sendEmail = async (options) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME } = process.env;

    // Check if configuration is missing
    const hasConfig = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL;

    if (!hasConfig) {
        console.log('\n==================================================');
        console.log('⚠️  SMTP CONFIGURATION IS MISSING IN .env');
        console.log('Email Details:');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.text}`);
        console.log('==================================================\n');
        return { success: true, loggedToConsole: true };
    }

    try {
        if (!transporterInstance) {
            transporterInstance = nodemailer.createTransport({
                pool: true, // Enable SMTP connection pooling
                maxConnections: 5,
                maxMessages: 100,
                host: SMTP_HOST,
                port: parseInt(SMTP_PORT, 10) || 587,
                secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
        }

        const mailOptions = {
            from: `"${SMTP_FROM_NAME || 'IGNYT'}" <${SMTP_FROM_EMAIL}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        const info = await transporterInstance.sendMail(mailOptions);
        console.log(`✉️  Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send email via SMTP:', error.message);
        console.log('\n==================================================');
        console.log('⚠️  FALLBACK: Email content:');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.text}`);
        console.log('==================================================\n');
        return { success: false, error: error.message, loggedToConsole: true };
    }
};

module.exports = sendEmail;
