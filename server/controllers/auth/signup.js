import User from '../../models/User.js';
import OTP from '../../models/OTP.js';
import { generateToken } from './helpers.js';

// @desc    Step 2 Signup: Verify OTP and Register
// @route   POST /api/auth/register
export const register = async (req, res) => {
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
};
