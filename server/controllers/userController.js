import User from '../models/User.js';

// @desc    Upload profile avatar
// @route   POST /api/users/avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const avatarUrl = `http://localhost:5000/uploads/avatars/${req.file.filename}`;
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.avatar = avatarUrl;
      await user.save();
      res.json({ avatar: avatarUrl });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Fetching profile failed' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.jobTitle = req.body.jobTitle !== undefined ? req.body.jobTitle : user.jobTitle;
      user.location = req.body.location !== undefined ? req.body.location : user.location;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.skills = req.body.skills !== undefined ? req.body.skills : user.skills;
      user.socialLinks = req.body.socialLinks || user.socialLinks;
      
      if (req.body.avatar) {
        user.avatar = req.body.avatar;
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        jobTitle: updatedUser.jobTitle,
        location: updatedUser.location,
        phone: updatedUser.phone,
        skills: updatedUser.skills,
        socialLinks: updatedUser.socialLinks,
        role: updatedUser.role
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
