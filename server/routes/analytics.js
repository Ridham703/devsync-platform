import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Get stats summary (Total Tasks, Completed, etc.)
// @route   GET /api/analytics/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const { projectId } = req.query;
    const matchQuery = {};
    if (projectId && projectId !== 'all') {
      matchQuery.projectId = new mongoose.Types.ObjectId(projectId);
    }

    const stats = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { 
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } 
          },
          inProgressTasks: { 
            $sum: { $cond: [{ $eq: ["$status", "inprogress"] }, 1, 0] } 
          },
          todoTasks: { 
            $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } 
          }
        }
      }
    ]);

    const teamMembersCount = await User.countDocuments();
    const projectsCount = await mongoose.model('Project').countDocuments();

    const result = stats[0] || { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0 };
    
    res.json({
      ...result,
      teamMembers: teamMembersCount,
      activeProjects: projectsCount,
      productivity: result.totalTasks > 0 ? Math.round((result.completedTasks / result.totalTasks) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get workflow velocity (Tasks completed over time)
// @route   GET /api/analytics/velocity
router.get('/velocity', protect, async (req, res) => {
  try {
    const { filter = 'week', projectId } = req.query;
    const matchQuery = { status: 'done' };
    
    if (projectId && projectId !== 'all') {
      matchQuery.projectId = new mongoose.Types.ObjectId(projectId);
    }

    let daysBack = 7;
    let format = "%Y-%m-%d";
    
    if (filter === 'month') daysBack = 30;
    if (filter === 'today') daysBack = 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    matchQuery.updatedAt = { $gte: startDate };

    const velocity = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: format, 
              date: { $ifNull: ["$completedAt", "$updatedAt"] } 
            } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json(velocity.map(v => ({ date: v._id, tasks: v.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get top performers (Leaderboard)
// @route   GET /api/analytics/leaderboard
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const leaderboard = await Task.aggregate([
      { $match: { status: 'done' } },
      {
        $group: {
          _id: "$assignedTo",
          completedCount: { $sum: 1 }
        }
      },
      { $sort: { completedCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 1,
          completedCount: 1,
          username: "$userDetails.username",
          avatar: "$userDetails.avatar"
        }
      }
    ]);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
