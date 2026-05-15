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

async function checkAllUsers() {
  try {
    const users = await User.find({});
    console.log('--- ALL USERS IN DATABASE ---');
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`ID: ${user._id} | Username: ${user.username} | Email: ${user.email} | Role: ${user.role} | Verified: ${user.isVerified}`);
      });
    } else {
      console.log('No users found in DB.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAllUsers();
