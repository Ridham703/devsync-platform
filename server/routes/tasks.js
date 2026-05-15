import express from 'express';
import { protect } from '../middleware/auth.js';
import { canMoveTask, canEditTask, canDeleteTask } from '../middleware/roleAuth.js';
import multer from 'multer';
import path from 'path';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getActivityLogs,
  uploadAttachment
} from '../controllers/taskController.js';

const router = express.Router();

// Multer Config for Attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB limit for attachments
});

// @desc    Get all tasks
// @route   GET /api/tasks
router.get('/', protect, getTasks);

// @desc    Create new task
// @route   POST /api/tasks
router.post('/', protect, createTask);

// @desc    Update existing task/status
// @route   PATCH /api/tasks/:id
// @access  Private
router.patch('/:id', protect, canEditTask, canMoveTask, updateTask);

// @desc    Delete task
// @route   DELETE /api/tasks/:id
router.delete('/:id', protect, canDeleteTask, deleteTask);

// @desc    Get activity logs for a task
// @route   GET /api/tasks/:id/activity
// @access  Private
router.get('/:id/activity', protect, getActivityLogs);

// @desc    Upload attachment to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
router.post('/:id/attachments', protect, upload.single('file'), uploadAttachment);

export default router;
