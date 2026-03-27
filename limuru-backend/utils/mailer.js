const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null; // email not configured — silently skip
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function notifyStaff(subject, text) {
  const t = getTransporter();
  if (!t) return; // no-op if SMTP isn't configured
  try {
    await t.sendMail({
      from: process.env.SMTP_USER || 'no-reply@limurudairy.co.ke',
      to: process.env.NOTIFY_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

module.exports = { notifyStaff };
