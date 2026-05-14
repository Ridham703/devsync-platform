import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true // e.g., 'STATUS_CHANGE', 'ASSIGNMENT', 'TASK_CREATED'
  },
  from: {
    type: String,
    default: null
  },
  to: {
    type: String,
    default: null
  },
  details: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
