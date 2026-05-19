import { logActivity } from '../../utils/activityLogger.js';

// @desc    Log out user and record activity
// @route   POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const io = req.app.get('io');
    
    // Log logout event in global Live Activity Stream
    await logActivity(io, {
      user: req.user._id,
      actionType: 'USER_LOGOUT',
      message: 'logged out'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[LogoutController] Error logging logout activity:', error);
    res.status(500).json({ message: error.message });
  }
};
