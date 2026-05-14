import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'devsync_super_secret_jwt_key_2026'
      );

      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid session token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No session token provided' });
  }
};
