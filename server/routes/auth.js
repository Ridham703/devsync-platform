import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { sendEmail, generateOTPHtml } from '../utils/email.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'devsync_super_secret_jwt_key_2026', 
    { expiresIn: '30d' }
  );
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Step 1: Send OTP for Signup or Reset
// @route   POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { email, type } = req.body; // 'signup' or 'reset'
  try {
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // For reset, check if user exists
    if (type === 'reset') {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp });

    await sendEmail({
      to: email,
      subject: type === 'signup' ? 'Verify Your DevSync Account' : 'Password Reset Request',
      html: generateOTPHtml(otp, type)
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Step 2 Signup: Verify OTP and Register
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, otp } = req.body;

  try {
    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: 'All details and OTP are required' });
    }

    // Verify OTP
    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check duplicates
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create User (verified)
    const user = await User.create({
      username,
      email,
      password,
      isVerified: true
    });

    // Cleanup OTP
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
    res.status(500).json({ message: error.message });
  }
});

// @desc    Step 2 Reset: Verify OTP and Change Password
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Verify OTP
    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    // Cleanup OTP
    await OTP.deleteMany({ email });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (user && (await user.comparePassword(password))) {
      // Check if verified (optional: you can block login if not verified)
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
