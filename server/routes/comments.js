import express from 'express';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get comments for a specific task
// @route   GET /api/comments/task/:taskId
// @access  Private
router.get('/task/:taskId', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'username email avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add a comment to a task
// @route   POST /api/comments
// @access  Private
router.post('/', protect, async (req, res) => {
  const { taskId, content } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = await Comment.create({
      task: taskId,
      user: req.user._id,
      content
    });

    // Increment comment count on task
    task.commentsCount = (task.commentsCount || 0) + 1;
    await task.save();

    // Log the activity
    await ActivityLog.create({
      task: taskId,
      user: req.user._id,
      action: 'COMMENT',
      details: 'Added a comment'
    });

    // Populate user info before returning
    await comment.populate('user', 'username email avatar');

    // Realtime notification & comment broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('default-project-board').emit('task-updated', { taskId });
      
      // Notify assigned users (excluding self)
      for (const assignee of task.assignedTo) {
        if (assignee.toString() !== req.user._id.toString()) {
          const notification = await Notification.create({
            sender: req.user._id,
            receiver: assignee,
            type: 'TASK_COMMENT',
            message: `${req.user.username} commented on task: ${task.title}`,
            relatedId: task._id,
            link: '/kanban'
          });

          io.to(assignee.toString()).emit('notification:new', {
            ...notification._doc,
            sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
          });
        }
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
