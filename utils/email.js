const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendBookingNotification({ patientName, date, time, email, phone }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping notification');
    return;
  }

  await transporter.sendMail({
    from: `YooshMD Bookings <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New Appointment: ${patientName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#4A0E0E;">New Appointment Booked</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7D4E4E;font-size:12px;text-transform:uppercase;font-weight:600;">Patient</td><td style="padding:8px 0;font-size:14px;">${patientName}</td></tr>
          <tr><td style="padding:8px 0;color:#7D4E4E;font-size:12px;text-transform:uppercase;font-weight:600;">Date</td><td style="padding:8px 0;font-size:14px;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:#7D4E4E;font-size:12px;text-transform:uppercase;font-weight:600;">Time</td><td style="padding:8px 0;font-size:14px;">${time} PT</td></tr>
          <tr><td style="padding:8px 0;color:#7D4E4E;font-size:12px;text-transform:uppercase;font-weight:600;">Email</td><td style="padding:8px 0;font-size:14px;">${email || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#7D4E4E;font-size:12px;text-transform:uppercase;font-weight:600;">Phone</td><td style="padding:8px 0;font-size:14px;">${phone || '—'}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:13px;color:#7D4E4E;">
          <a href="https://www.drchrono.com/login" style="color:#4A0E0E;font-weight:600;">Log into DrChrono</a> to switch to a video visit.
        </p>
      </div>
    `,
  });
}

module.exports = { sendBookingNotification };
