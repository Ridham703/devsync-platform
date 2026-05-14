import express from 'express';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, description, teamId, color } = req.body;

  try {
    // Check if user is a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Only team members can create projects' });
    }

    const project = await Project.create({
      name,
      description,
      team: teamId,
      owner: req.user._id,
      color
    });

    // Trigger Notifications for all team members
    const io = req.app.get('io');
    if (io && team) {
      for (const member of team.members) {
        if (member.user.toString() !== req.user._id.toString()) {
          const notification = await Notification.create({
            sender: req.user._id,
            receiver: member.user,
            type: 'PROJECT_CREATED',
            message: `${req.user.username} created a new project: ${name}`,
            relatedId: project._id,
            link: '/dashboard'
          });

          io.to(member.user.toString()).emit('notification:new', {
            ...notification._doc,
            sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
          });
        }
      }
    }

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get team projects
// @route   GET /api/projects/team/:teamId
// @access  Private
router.get('/team/:teamId', protect, async (req, res) => {
  try {
    const projects = await Project.find({ team: req.params.teamId })
      .populate('owner', 'username email avatar');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user's projects across all teams
// @route   GET /api/projects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find teams user belongs to
    const teams = await Team.find({ 'members.user': req.user._id });
    const teamIds = teams.map(t => t._id);

    const projects = await Project.find({ team: { $in: teamIds } })
      .populate('team', 'name')
      .populate('owner', 'username email avatar');
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
