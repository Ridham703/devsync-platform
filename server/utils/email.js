import nodemailer from 'nodemailer';

/**
 * Configure production-ready Gmail transporter
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Helps in some restricted networks
  },
  connectionTimeout: 10000,
  socketTimeout: 10000
});

// SMTP will be verified on first send attempt

/**
 * Delivers transactional emails with professional formatting
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

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
    console.log(`[EMAIL-DEBUG] Attempting to deliver email to ${to}...`);
    
    // Hard 20-second timeout to prevent hanging the API
    const emailPromise = transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      priority: 'high'
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email delivery timed out after 20 seconds')), 20000)
    );

    const info = await Promise.race([emailPromise, timeoutPromise]);

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
