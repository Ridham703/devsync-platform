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

// @desc    Send simulated OTP (Signup & Recovery)
// @desc    Verify user existence for recovery
// @route   POST /api/auth/check-user
router.post('/check-user', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    res.json({ exists: true, message: 'Account validated.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All registration details are required' });
    }

    // Check duplicates
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create User
    const user = await User.create({
      username,
      email,
      password
    });

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

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find and verify user
    const user = await User.findOne({ email }).select('+password');
    
    if (user && (await user.comparePassword(password))) {
      // Handle legacy users without avatars
      if (!user.avatar) {
        user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`;
        await user.save();
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

// @desc    Reset Password Directly
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Load user and overwrite password triggering model hooks
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User no longer exists' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password update complete. Please log in again.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
