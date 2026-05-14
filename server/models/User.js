import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'], 
    unique: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'], 
    select: false 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  bio: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  skills: [{
    type: String
  }],
  socialLinks: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'assignment_man', 'visitor'], 
    default: 'assignment_man' 
  }
}, {
  timestamps: true
});

// Automatic avatar generation before saving
userSchema.pre('save', function(next) {
  // If avatar is empty, generate it (handles both new and existing users without one)
  if (!this.avatar) {
    // Generate avatar URL based on username (initials)
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.username)}&background=random&color=fff&size=128`;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Instance method to check passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
