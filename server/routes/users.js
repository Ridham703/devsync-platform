import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import {
  uploadAvatar,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController.js';

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2000000 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: Images Only (jpeg/jpg/png)!'));
  }
});

// @desc    Upload profile avatar
// @route   POST /api/users/avatar
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

// @desc    Get current user profile
// @route   GET /api/users/me
router.get('/me', protect, getUserProfile);

// @desc    Update user profile
// @route   PUT /api/users/profile
router.put('/profile', protect, updateUserProfile);

export default router;
