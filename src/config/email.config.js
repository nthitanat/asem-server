const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  from: {
    email: process.env.FROM_EMAIL || 'noreply@asem.com',
    name: process.env.FROM_NAME || 'ASEM Server'
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  verification: {
    enabled: process.env.EMAIL_VERIFICATION_ENABLED !== 'false'
  }
};

module.exports = emailConfig;
