import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createTeam,
  getUserTeams,
  getPendingInvitations,
  getTeamById,
  inviteMember,
  joinTeam,
  declineInvitation,
  assignMemberRole,
  deleteTeam,
  removeMember
} from '../controllers/teamController.js';

const router = express.Router();

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
router.post('/', protect, createTeam);

// @desc    Get user's teams
// @route   GET /api/teams
// @access  Private
router.get('/', protect, getUserTeams);

// @desc    Get user's pending invitations
// @route   GET /api/teams/invitations
// @access  Private
router.get('/invitations', protect, getPendingInvitations);

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
router.get('/:id', protect, getTeamById);

// @desc    Invite a member to team
// @route   POST /api/teams/:id/invite
// @access  Private (Owner/Admin only)
router.post('/:id/invite', protect, inviteMember);

// @desc    Join a team (accept invite)
// @route   POST /api/teams/:id/join
// @access  Private
router.post('/:id/join', protect, joinTeam);

// @desc    Decline a team invitation
// @route   POST /api/teams/:id/decline
// @access  Private
router.post('/:id/decline', protect, declineInvitation);

// @desc    Assign Role to member
// @route   PATCH /api/teams/:id/members/:userId/role
// @access  Private (Owner/Admin only)
router.patch('/:id/members/:userId/role', protect, assignMemberRole);

// @desc    Delete a team
// @route   DELETE /api/teams/:id
// @access  Private (Owner only)
router.delete('/:id', protect, deleteTeam);

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private (Owner/Admin only)
router.delete('/:id/members/:userId', protect, removeMember);

export default router;
