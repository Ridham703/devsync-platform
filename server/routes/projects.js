import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createProject,
  getTeamProjects,
  getUserProjects
} from '../controllers/projectController.js';

const router = express.Router();

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
router.post('/', protect, createProject);

// @desc    Get team projects
// @route   GET /api/projects/team/:teamId
// @access  Private
router.get('/team/:teamId', protect, getTeamProjects);

// @desc    Get user's projects across all teams
// @route   GET /api/projects
// @access  Private
router.get('/', protect, getUserProjects);

export default router;
