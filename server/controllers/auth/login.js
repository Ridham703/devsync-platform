import User from '../../models/User.js';
import { generateToken } from './helpers.js';

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log(`[AUTH-LOGIN] User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`[AUTH-LOGIN] Password match for ${email}: ${isMatch}`);

    if (isMatch) {
      if (!user.isVerified) {
        console.log(`[AUTH-LOGIN] User not verified: ${email}`);
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
};
