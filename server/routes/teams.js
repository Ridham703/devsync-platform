import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, description } = req.body;

  try {
    const team = await Team.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user's teams
// @route   GET /api/teams
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user's pending invitations
// @route   GET /api/teams/invitations
// @access  Private
router.get('/invitations', protect, async (req, res) => {
  try {
    const teams = await Team.find({ 'invitations.email': req.user.email })
      .populate('owner', 'username email avatar');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    if (!team.members.some(m => m.user._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Invite a member to team
// @route   POST /api/teams/:id/invite
// @access  Private (Owner/Admin only)
router.post('/:id/invite', protect, async (req, res) => {
  const { email } = req.body;

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if requester is admin/owner
    const member = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || (member.role !== 'admin' && team.owner.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can invite members' });
    }

    // Check if already a member
    const userToInvite = await User.findOne({ email });
    if (userToInvite && team.members.some(m => m.user.toString() === userToInvite._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Check if already invited
    if (team.invitations.some(inv => inv.email === email)) {
      return res.status(400).json({ message: 'Invitation already sent' });
    }

    team.invitations.push({ email });
    await team.save();

    // Emit real-time notification if user exists
    if (userToInvite) {
      const notification = await Notification.create({
        sender: req.user._id,
        receiver: userToInvite._id,
        type: 'TEAM_INVITE',
        message: `${req.user.username} invited you to join team ${team.name}`,
        relatedId: team._id,
        link: '/teams'
      });

      const io = req.app.get('io');
      if (io) {
        io.to(userToInvite._id.toString()).emit('notification:new', {
          ...notification._doc,
          sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
        });
      }
    }

    res.json({ message: 'Invitation sent successfully', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Join a team (accept invite)
// @route   POST /api/teams/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has an invitation
    const inviteIndex = team.invitations.findIndex(inv => inv.email === req.user.email);
    if (inviteIndex === -1) {
      return res.status(403).json({ message: 'No invitation found for this user' });
    }

    // Add user to members and remove invitation
    team.members.push({ user: req.user._id, role: 'member' });
    team.invitations.splice(inviteIndex, 1);
    await team.save();

    // Emit real-time notification to the team and user
    const io = req.app.get('io');
    io.to(req.user._id.toString()).emit('team-joined', { teamId: team._id, teamName: team.name });
    // Notify other members
    team.members.forEach(m => {
      io.to(m.user.toString()).emit('member-joined', { teamId: team._id, user: req.user });
    });

    res.json({ message: 'Successfully joined the team', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Decline a team invitation
// @route   POST /api/teams/:id/decline
// @access  Private
router.post('/:id/decline', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Remove invitation
    team.invitations = team.invitations.filter(inv => inv.email !== req.user.email);
    await team.save();

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Assign Role to member
// @route   PATCH /api/teams/:id/members/:userId/role
// @access  Private (Owner/Admin only)
router.patch('/:id/members/:userId/role', protect, async (req, res) => {
  const { role } = req.body;

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if requester is admin/owner
    const requester = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requester || (requester.role !== 'admin' && team.owner.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can change roles' });
    }

    // Find member to update
    const memberIndex = team.members.findIndex(m => m.user.toString() === req.params.userId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in team' });
    }

    team.members[memberIndex].role = role;
    await team.save();

    res.json({ message: 'Role updated successfully', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a team
// @route   DELETE /api/teams/:id
// @access  Private (Owner only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team owner can delete the team' });
    }

    const members = [...team.members];
    const teamId = team._id;

    await Team.findByIdAndDelete(req.params.id);

    // Notify all members
    const io = req.app.get('io');
    members.forEach(m => {
      io.to(m.user.toString()).emit('team-deleted', { teamId });
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private (Owner/Admin only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if requester is admin/owner
    const requester = team.members.find(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = requester && requester.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }

    // Cannot remove owner
    if (team.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the team owner' });
    }

    // Remove member
    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();

    // Notify the removed user
    const io = req.app.get('io');
    io.to(req.params.userId).emit('removed-from-team', { teamId: team._id });
    
    // Notify remaining members
    team.members.forEach(m => {
      io.to(m.user.toString()).emit('member-removed', { teamId: team._id, userId: req.params.userId });
    });

    res.json({ message: 'Member removed successfully', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
