import User from '../../models/User.js';
import OTP from '../../models/OTP.js';
import { sendEmail, generateOTPHtml } from '../../utils/email.js';
import { generateOTPCode } from './helpers.js';

// @desc    Step 1: Send OTP for Signup or Reset
// @route   POST /api/auth/send-otp
export const sendOTP = async (req, res) => {
  const { email, type } = req.body;
  try {
    console.log(`[AUTH] OTP request received for: ${email} (Type: ${type})`);

    if (type === 'signup') {
      const userExists = await User.findOne({ email });
      if (userExists) {
        if (userExists.isVerified) {
          return res.status(400).json({ message: 'User already exists and is verified. Please log in.' });
        }
        // If user exists but not verified, allow sending OTP to complete verification
        console.log(`[AUTH] Unverified user ${email} requesting new OTP for verification.`);
      }
    }

    if (type === 'reset') {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTPCode();
    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp });

    // Send email (awaiting for reliability and immediate feedback)
    try {
      const subject = type === 'signup' ? 'Verify Your DevSync Account' : 'DevSync Password Recovery';
      console.log(`[EMAIL-QUEUED] Sending ${type} OTP to ${email} with subject: ${subject}`);
      
      await sendEmail({
        to: email,
        subject,
        html: generateOTPHtml(otp, type)
      });
    } catch (emailError) {
      console.error(`[EMAIL-ERROR] ${emailError.message}`);
      // If email fails, we shouldn't tell the user it was sent
      return res.status(500).json({ message: 'Failed to deliver OTP email. Please check your email address or try again later.' });
    }

    // Immediate response to frontend
    res.json({ message: 'OTP sent! Please check your inbox (and spam).' });
  } catch (error) {
    console.error(`[AUTH] OTP send failed for ${email}:`, error.message);
    res.status(500).json({ message: error.message });
  }
};
