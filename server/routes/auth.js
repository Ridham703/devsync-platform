import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendOTP } from '../controllers/auth/sendOtp.js';
import { register } from '../controllers/auth/signup.js';
import { login } from '../controllers/auth/login.js';
import { resetPassword } from '../controllers/auth/resetPass.js';
import { 
  validateSignup, 
  validateLogin, 
  validateSendOtp 
} from '../middleware/validation.js';

const router = express.Router();

// Rate limiting for OTP requests to prevent abuse
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: { message: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// @desc    Step 1: Send OTP for Signup or Reset
// @route   POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, validateSendOtp, sendOTP);

// @desc    Step 2 Signup: Verify OTP and Register
// @route   POST /api/auth/register
router.post('/register', validateSignup, register);

// @desc    Step 2 Reset: Verify OTP and Change Password
router.post('/reset-password', resetPassword);

// @desc    Authenticate user & get token
router.post('/login', validateLogin, login);

export default router;
