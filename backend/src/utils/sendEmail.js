const nodemailer = require('nodemailer');
const https = require('https');

// Cache the transporter globally to reuse SMTP connections
let transporterInstance = null;

/**
 * Helper to send email via Resend's REST HTTP API (avoids SMTP port blocking on Render Free tier)
 */
const sendViaResendApi = (apiKey, from, to, subject, text, html) => {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            text,
            html,
        });

        const req = https.request({
            hostname: 'api.resend.com',
            port: 443,
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ success: true, messageId: parsed.id });
                    } catch (e) {
                        resolve({ success: true, rawResponse: body });
                    }
                } else {
                    reject(new Error(`Resend API returned status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
};

/**
 * Send email helper using Resend HTTPS API or standard Nodemailer/SMTP as fallback.
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

    const fromString = `"${SMTP_FROM_NAME || 'IGNYT'}" <${SMTP_FROM_EMAIL}>`;

    // Detect if we are using Resend and bypass standard SMTP to avoid Render port blocking
    if (SMTP_HOST === 'smtp.resend.com') {
        try {
            console.log(`✉️ Sending email via Resend HTTPS API...`);
            const res = await sendViaResendApi(
                SMTP_PASS,
                fromString,
                options.to,
                options.subject,
                options.text,
                options.html
            );
            console.log(`✉️ Email sent via Resend API: ${res.messageId}`);
            return res;
        } catch (error) {
            console.error('❌ Failed to send email via Resend API:', error.message);
            // Fallback to console logging
            console.log('\n==================================================');
            console.log('⚠️  FALLBACK: Email content:');
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body:\n${options.text}`);
            console.log('==================================================\n');
            return { success: false, error: error.message, loggedToConsole: true };
        }
    }

    // Default to SMTP connection pooling for other hosts
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
            from: fromString,
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
