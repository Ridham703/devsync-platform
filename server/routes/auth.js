import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { sendEmail, generateOTPHtml } from '../utils/email.js';
import { validateSignup, validateLogin, validateSendOtp } from '../middleware/validation.js';

const router = express.Router();

// Rate limiting for OTP requests to prevent abuse
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: { message: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'devsync_super_secret_jwt_key_2026', 
    { expiresIn: '30d' }
  );
};

const generateOTPCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Step 1: Send OTP for Signup or Reset
// @route   POST /api/auth/send-otp
router.post('/send-otp', validateSendOtp, async (req, res) => {
  const { email, type } = req.body;
  try {
    console.log(`[AUTH] OTP request received for: ${email} (Type: ${type})`);

    if (type === 'signup') {
      const userExists = await User.findOne({ email });
      if (userExists) return res.status(400).json({ message: 'User already exists with this email' });
    }

    if (type === 'reset') {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTPCode();
    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp });

    // Send email in the background for absolute speed (non-blocking)
    sendEmail({
      to: email,
      subject: type === 'signup' ? 'Verify Your DevSync Account' : 'Password Reset Request',
      html: generateOTPHtml(otp, type)
    }).catch(err => console.error(`[BACKGROUND-EMAIL-ERROR] ${err.message}`));

    // Immediate response to frontend
    res.json({ message: 'OTP sent! Please check your inbox (and spam).' });
  } catch (error) {
    console.error(`[AUTH] OTP send failed for ${email}:`, error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Step 2 Signup: Verify OTP and Register
// @route   POST /api/auth/register
router.post('/register', validateSignup, async (req, res) => {
  const { username, email, password, otp } = req.body;

  try {
    // Verify OTP
    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) {
      console.log(`[AUTH] Verification failed for ${email}: Invalid or expired OTP`);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Double check duplicate before creation
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
      isVerified: true
    });

    console.log(`✅ User registered successfully: ${email}`);

    // Cleanup OTP after successful verification
    await OTP.deleteMany({ email });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(`[AUTH] Registration failed for ${email}:`, error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Step 2 Reset: Verify OTP and Change Password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    console.log(`✅ Password reset successful for: ${email}`);

    // Cleanup OTP
    await OTP.deleteMany({ email });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user & get token
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (user && (await user.comparePassword(password))) {
      if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email before logging in' });
      }

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
