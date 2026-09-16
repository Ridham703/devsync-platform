import nodemailer from 'nodemailer';

const getEmailCredentials = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  let pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();
  pass = pass.replace(/^["']|["']$/g, '');
  return { user, pass };
};

/**
 * Configure production-ready Gmail transporter
 */
const getTransporter = () => {
  const { user, pass } = getEmailCredentials();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Delivers transactional emails with professional formatting
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const { user, pass } = getEmailCredentials();
  const from = process.env.EMAIL_FROM || user;

  // Require actual credentials so emails are actually delivered to user inbox
  if (
    !user || 
    !pass || 
    user.includes('your_email') || 
    pass.includes('your_gmail')
  ) {
    console.error('❌ Email credentials missing or placeholder in server/.env');
    throw new Error('Email credentials not configured. Please add EMAIL_USER and EMAIL_PASS (Gmail App Password) in server/.env to deliver emails to your inbox.');
  }

  try {
    console.log(`[EMAIL-DEBUG] Attempting to deliver email to ${to}...`);
    const transporter = getTransporter();
    
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
      setTimeout(() => reject(new Error('Email delivery timed out after 20 seconds. Please check your Gmail App Password and network connection.')), 20000)
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
