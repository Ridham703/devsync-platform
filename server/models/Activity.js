import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_MOVED',
      'TASK_ASSIGNED',
      'TEAM_JOINED',
      'MESSAGE_SENT',
      'PR_MERGED',
      'DEPLOYMENT_STARTED',
      'ISSUE_CREATED',
      'USER_LOGIN',
      'USER_LOGOUT'
    ]
  },
  message: {
    type: String,
    required: true
  },
  target: {
    type: String,
    default: ''
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for efficient filtering
activitySchema.index({ teamId: 1, createdAt: -1 });
activitySchema.index({ actionType: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
