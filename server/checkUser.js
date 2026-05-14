import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devsync');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    const user = await User.findOne({ 
      $or: [
        { username: { $regex: 'ridham', $options: 'i' } },
        { email: { $regex: 'ridham', $options: 'i' } }
      ]
    });
    console.log('--- USER INFO IN DATABASE ---');
    if (user) {
      console.log('ID:', user._id);
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
    } else {
      console.log('User not found in DB.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkUser();
