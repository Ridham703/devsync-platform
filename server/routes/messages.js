import express from 'express';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Fetch messages for a channel/team
// @route   GET /api/messages/:channel
router.get('/:channel', protect, async (req, res) => {
  const { teamId } = req.query;
  try {
    // If teamId is provided, check if user is a member
    if (teamId && teamId !== 'bot' && teamId !== 'undefined' && teamId !== 'null') {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findById(teamId);
      if (!team || !team.members.some(m => m.user.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to view these messages' });
      }
    }

    const query = teamId && teamId !== 'undefined' && teamId !== 'null' ? { teamId } : { channel: req.params.channel };
    const messages = await Message.find(query)
      .populate('userId', 'avatar username')
      .sort({ createdAt: 1 })
      .limit(100);
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Fetching chat history failed' });
  }
});

// @desc    Explicitly persist a chat message
// @route   POST /api/messages
router.post('/', protect, async (req, res) => {
  const { text, channel, isCode, code, teamId } = req.body;

  try {
    if (!text) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const userInitial = req.user.username.charAt(0).toUpperCase();
    
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-indigo-500',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-500'
    ];
    const userColor = colors[req.user.username.length % colors.length];

    const newMessage = new Message({
      user: req.user.username,
      userId: req.user._id,
      initial: userInitial,
      color: userColor,
      text,
      channel: channel || 'general',
      teamId: teamId || null,
      isCode: isCode || false,
      code: code || ''
    });

    const savedMessage = await newMessage.save();

    // Trigger Notifications for @mentions
    const mentions = text.match(/@(\w+)/g);
    if (mentions) {
      const uniqueMentions = [...new Set(mentions)];
      const io = req.app.get('io');
      for (const mention of uniqueMentions) {
        const targetUsername = mention.substring(1);
        const targetUser = await User.findOne({ username: targetUsername });
        
        if (targetUser && targetUser._id.toString() !== req.user._id.toString()) {
          const notification = await Notification.create({
            sender: req.user._id,
            receiver: targetUser._id,
            type: 'CHAT_MENTION',
            message: `${req.user.username} mentioned you in chat`,
            relatedId: savedMessage._id,
            link: '/chat'
          });

          if (io) {
            io.to(targetUser._id.toString()).emit('notification:new', {
              ...notification._doc,
              sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
            });
          }
        }
      }
    }

    // Emit real-time message via Socket.io
    const io = req.app.get('io');
    if (io && teamId) {
      io.to(teamId.toString()).emit('receive-message', savedMessage);
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Sending message failed' });
  }
});

// @desc    Clear all messages for a team
// @route   DELETE /api/messages/team/:teamId
router.delete('/team/:teamId', protect, async (req, res) => {
  try {
    // Check if user is a member of the team
    const Team = (await import('../models/Team.js')).default;
    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if requester is admin or owner
    const requester = team.members.find(m => m.user.toString() === req.user._id.toString());
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = requester && requester.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only team admins or the owner can clear chat history' });
    }

    await Message.deleteMany({ teamId: req.params.teamId });
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Clearing chat failed' });
  }
});

export default router;
