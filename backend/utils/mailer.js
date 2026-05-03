const nodemailer = require('nodemailer');

// ── Gmail Setup (one-time) ────────────────────────────────────────────────────
// Your regular Gmail password will NOT work here.
// Gmail requires an App Password when 2FA is enabled (which it should be).
//
// Steps to get an App Password:
//   1. Go to myaccount.google.com → Security
//   2. Make sure 2-Step Verification is ON
//   3. Search "App Passwords" in the search bar
//   4. Select app: Mail → Select device: Other → type "SkillSync" → Generate
//   5. Copy the 16-character password (no spaces)
//   6. Add to Render env vars:
//        EMAIL_USER = your.gmail@gmail.com
//        EMAIL_PASS = xxxxxxxxxxxxxxxx   (the 16-char app password, no spaces)
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
    },
});

// Verify on startup — surfaces config errors in Render logs immediately
// instead of discovering them silently when the first email fails.
transporter.verify((err) => {
    if (err) {
        console.error('[EMAIL] Nodemailer connection failed:', err.message);
        console.error('[EMAIL] Check EMAIL_USER and EMAIL_PASS env vars on Render.');
    } else {
        console.log('[EMAIL] Nodemailer ready — Gmail SMTP connected.');
    }
});

exports.sendInactivityEmail = async (email, name) => {
    const mailOptions = {
        from: `"SkillSync Bot" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'We Miss You on Codeforces! 💻',
        text: `Hi ${name},\n\nWe noticed you haven't solved any problems on Codeforces in the past week.\nEven one problem a day keeps the rust away!\n\nJump back in and keep that rating climbing. 💪\n\n— SkillSync Bot`,
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Hey ${name}! 👋</h2>
                <p>
                    We noticed you haven't solved any problems on Codeforces
                    in the past week. Even one problem a day keeps the rust away!
                </p>
                <p>Jump back in and keep that rating climbing. 💪</p>
                <p style="color: #888; font-size: 13px;">— SkillSync Bot</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${email} (${name}) — MessageId: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`[EMAIL] Failed to send to ${email}:`, err.message);
        return false;
    }
};