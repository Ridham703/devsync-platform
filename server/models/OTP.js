import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB native self-destruction index - expires in 5 minutes (300s)
    index: { expires: 300 } 
  }
});

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
