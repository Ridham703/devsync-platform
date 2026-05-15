import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

console.log('Testing connection to:', MONGO_URI ? 'Atlas URI (hidden)' : 'undefined');

async function testConnection() {
  try {
    if (!MONGO_URI) throw new Error('MONGO_URI not found in .env');
    
    console.log('Connecting...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected successfully to Atlas!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    console.log('Trying local connection as fallback...');
    try {
      await mongoose.connect('mongodb://localhost:27017/devsync', { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected successfully to Local MongoDB!');
    } catch (localError) {
      console.error('❌ Local connection also failed:', localError.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
