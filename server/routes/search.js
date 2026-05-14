import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Global search across tasks, projects, and teams
// @route   GET /api/search
router.get('/', protect, async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ tasks: [], projects: [], teams: [] });
  }

  try {
    const regex = new RegExp(q, 'i');

    const [tasks, projects, teams] = await Promise.all([
      Task.find({ 
        $or: [
          { title: regex },
          { description: regex }
        ]
      }).limit(5),
      Project.find({
        $or: [
          { name: regex },
          { description: regex }
        ]
      }).limit(5),
      Team.find({
        name: regex
      }).limit(5)
    ]);

    res.json({
      tasks,
      projects,
      teams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
