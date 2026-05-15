import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/devsync';

async function resetPassword() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const userSchema = new mongoose.Schema({
      email: String,
      password: { type: String, select: false }
    });
    
    const User = mongoose.model('User', userSchema);
    
    const email = 'ridhammangroliya@gmail.com';
    const newPassword = 'Password123';
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const result = await User.updateOne({ email }, { password: hashedPassword });
    
    if (result.matchedCount > 0) {
      console.log(`Password reset for ${email} to "Password123"`);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
