import nodemailer from 'nodemailer';

/**
 * Configure production-ready Gmail transporter
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL is generally faster than STARTTLS on 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,
  maxConnections: 5,
  rateLimit: 1, // 1 email per second
  connectionTimeout: 5000,
  socketTimeout: 5000
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error.message);
  } else {
    console.log('✅ SMTP Server is ready to deliver messages');
  }
});

/**
 * Delivers transactional emails with professional formatting
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_USER; // Simplest format

  // Fallback to Ethereal ONLY if explicitly in test mode or if credentials are missing
  if (process.env.NODE_ENV === 'test' || (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
    console.log('[EMAIL] Using Ethereal fallback for test/dev mode...');
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    
    const info = await testTransporter.sendMail({ from: '"DevSync Sandbox" <noreply@ethereal.email>', to, subject, html, text });
    console.log('[EMAIL] Preview URL:', nodemailer.getTestMessageUrl(info));
    return info;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      priority: 'high'
    });

    console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email delivery failed to ${to}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Generates a premium HTML template for OTP
 */
export const generateOTPHtml = (otp, type = 'signup') => {
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; background: #000; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      <h2 style="color: #8b5cf6; text-align: center; margin-bottom: 20px;">DevSync Verification</h2>
      <p style="color: #ccc; text-align: center;">Use the code below to ${type === 'signup' ? 'verify your account' : 'reset your password'}:</p>
      <div style="background: #111; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #fff; border-radius: 8px; margin: 20px 0;">${otp}</div>
      <p style="color: #666; font-size: 12px; text-align: center;">Expires in 5 minutes.</p>
    </div>
  `;
};
