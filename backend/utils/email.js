const nodemailer = require("nodemailer");

function isEmailConfigured() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SERVICE
  } = process.env;

  if (SMTP_SERVICE) {
    return Boolean(SMTP_USER && SMTP_PASS);
  }

  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SERVICE
  } = process.env;

  if (SMTP_SERVICE) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("Missing SMTP_USER or SMTP_PASS");
    }

    return nodemailer.createTransport({
      service: SMTP_SERVICE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Missing SMTP configuration");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendOtpEmail({ to, name, otpCode, subject, intro }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `${intro}\n\nYour OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 16px;">${subject}</h2>
        <p>Hello${name ? ` ${name}` : ""},</p>
        <p>${intro}</p>
        <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
          <div style="font-size: 30px; font-weight: 700; letter-spacing: 6px;">${otpCode}</div>
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `
  });
}

module.exports = { sendOtpEmail, isEmailConfigured };
