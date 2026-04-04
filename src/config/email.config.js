const emailConfig = {
  // SMTP settings (used in dev/MailDev when Gmail OAuth2 is not configured)
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Gmail OAuth2 settings (used in production to bypass SMTP firewall)
  gmail: {
    user: process.env.GMAIL_USER || process.env.SMTP_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
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
