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
 * Supports Resend HTTPS API (ideal for Render free tier which blocks SMTP ports 465/587)
 * and standard Nodemailer Gmail SMTP fallback.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  // Option 1: Resend HTTPS API (Port 443 - NEVER blocked by Render or cloud providers)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EMAIL-DEBUG] Delivering email via Resend HTTPS API to ${to}...`);
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'DevSync <onboarding@resend.dev>',
          to: [to],
          subject,
          html: html || text
        })
      });

      const resendData = await resendResponse.json();
      if (!resendResponse.ok) {
        throw new Error(resendData.message || 'Resend API failed');
      }
      console.log(`✅ Email sent successfully via Resend to ${to}: ${resendData.id}`);
      return resendData;
    } catch (apiError) {
      console.error(`❌ Resend API delivery failed:`, apiError.message);
      throw new Error(`Resend delivery failed: ${apiError.message}`);
    }
  }

  // Option 2: Brevo HTTPS API (Port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[EMAIL-DEBUG] Delivering email via Brevo HTTPS API to ${to}...`);
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'DevSync', email: process.env.EMAIL_USER || 'support@devsync.com' },
          to: [{ email: to }],
          subject,
          htmlContent: html || text
        })
      });
      const brevoData = await brevoResponse.json();
      if (!brevoResponse.ok) {
        throw new Error(brevoData.message || 'Brevo API failed');
      }
      console.log(`✅ Email sent successfully via Brevo to ${to}`);
      return brevoData;
    } catch (apiError) {
      console.error(`❌ Brevo API delivery failed:`, apiError.message);
      throw new Error(`Brevo delivery failed: ${apiError.message}`);
    }
  }

  // Option 3: Standard SMTP (Gmail)
  const { user, pass } = getEmailCredentials();
  const from = process.env.EMAIL_FROM || user;

  if (!user || !pass || user.includes('your_email') || pass.includes('your_gmail')) {
    console.error('❌ Email credentials missing or placeholder in server/.env');
    throw new Error('Email credentials not configured. Please add SMTP_USER/SMTP_PASS or RESEND_API_KEY in server/.env or Render Environment.');
  }

  try {
    console.log(`[EMAIL-DEBUG] Attempting to deliver email to ${to} via SMTP...`);
    const transporter = getTransporter();
    
    // Fast 7-second timeout for cloud environments that block SMTP ports
    const emailPromise = transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      priority: 'high'
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email delivery timed out after 7 seconds. Note: Render free tier blocks outbound SMTP ports 465/587.')), 7000)
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
