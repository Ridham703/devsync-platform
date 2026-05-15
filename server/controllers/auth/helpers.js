import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'devsync_super_secret_jwt_key_2026', 
    { expiresIn: '30d' }
  );
};

export const generateOTPCode = () => Math.floor(100000 + Math.random() * 900000).toString();
