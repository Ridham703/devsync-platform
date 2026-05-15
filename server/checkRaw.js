import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/devsync';

async function checkRawEmails() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log('--- RAW USERS IN DB ---');
    users.forEach(u => {
      console.log(`Email: "${u.email}", Username: "${u.username}", Verified: ${u.isVerified}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkRawEmails();
