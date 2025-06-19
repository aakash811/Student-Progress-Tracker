const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    // host: process.env.HOST || 'smtp.ethereal.email',
    // port: process.env.EMAIL_PORT || 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendInactivityEmail = async (email, name) => {
    const mailOptions = {
        from: `"TLE Eliminators" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "We Miss You on Codeforces!",
        text: `Hi ${name},\n\nWe've noticed you haven’t solved any problems on Codeforces in the past week. Time to get back and smash some problems! 💪\n\nCheers,\nTLE Tracker Bot`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${email} (${name}) - MessageId: ${info.messageId}`);
    } catch (err) {
        console.error(`[EMAIL] Failed to send to ${email}:`, err.message);
    }
};