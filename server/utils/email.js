import nodemailer from 'nodemailer';


/**
 * Delivers transactional emails reading configured SMTP parameters.
 * Falls back intelligently to ephemeral Ethereal sandbox instances for dev environments.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  let host = process.env.SMTP_HOST;
  let port = parseInt(process.env.SMTP_PORT || '587', 10);
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let from = process.env.EMAIL_FROM || '"DevSync Support" <support@devsync.com>';

  let transporter;

  // Detection and automatic provision of sandboxes if config keys are absent
  if (!host || !user || !pass) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      host = 'smtp.ethereal.email';
      port = 587;
      user = testAccount.user;
      pass = testAccount.pass;
      from = '"DevSync Sandbox" <noreply@ethereal.email>';
    } catch (accountErr) {
      throw accountErr;
    }
  }

  // High-Speed Dynamic Transporter Configuration
  if (host === 'smtp.gmail.com' || (user && user.endsWith('@gmail.com'))) {
    // Bypasses manual TLS negotiations for extreme dispatch speed
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    return info;
  } catch (mailErr) {
    throw mailErr;
  }
};

/**
 * Formats responsive, branded HTML bodies matching DevSync dark design aesthetics
 */
export const generateOTPHtml = (otpCode, context = 'signup') => {
  const isSignup = context === 'signup';

  const titleText = isSignup ? 'Confirm Your Identity' : 'Reset Your Account Password';

  const descText = isSignup
    ? 'Welcome to DevSync! You’re one step away from joining your real-time developer workspace. Use the verification key below to finalize your registration.'
    : 'We received a request to modify your DevSync account credentials. Use the temporary key below inside your recovery form to securely enter a new password.';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        background-color: #0d0d12 !important;
        margin: 0 !important;
        padding: 40px 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e4e4e7;
      }
      .wrapper {
        max-width: 480px;
        margin: 0 auto;
        background: #161620;
        border-radius: 20px;
        padding: 40px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .logo {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.5px;
        margin-bottom: 32px;
      }
      .logo span {
        color: #8b5cf6;
      }
      h1 {
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 16px;
        letter-spacing: -0.5px;
      }
      p {
        color: #a1a1aa;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 36px;
      }
      .card {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.05) 100%);
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 16px;
        padding: 36px 24px;
        text-align: center;
        margin-bottom: 36px;
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 800;
        letter-spacing: 2px;
        color: #a78bfa;
        margin-bottom: 14px;
      }
      .code {
        font-family: "Courier New", Courier, monospace;
        font-size: 42px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 10px;
        margin: 0;
        text-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
      }
      .expiry {
        font-size: 12px;
        color: #71717a;
        text-align: center;
        margin-bottom: 24px;
      }
      .footer {
        font-size: 11px;
        color: #52525b;
        text-align: center;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 24px;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="logo"><span>Dev</span>Sync</div>
      <h1>${titleText}</h1>
      <p>${descText}</p>
      
      <div class="card">
        <div class="label">Security Key</div>
        <div class="code">${otpCode}</div>
      </div>
      
      <div class="expiry">⚠️  This security key stays active for exactly 5 minutes.</div>
      
      <div class="footer">
        This transactional mail is automated. If you did not make this request, please ignore it.
      </div>
    </div>
  </body>
  </html>
  `;
};
