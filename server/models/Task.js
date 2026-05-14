import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Task title is required'], 
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE'], 
    default: 'TODO' 
  },
  tag: { 
    type: String, 
    default: 'Task' // Feature, Bug, Design, DevOps, Task
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  assignedTo: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  commentsCount: { 
    type: Number, 
    default: 0 
  },
  project: { 
    type: String, 
    default: 'DevSync core sprint' 
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    url: String,
    filename: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

// Optimization Indexes
taskSchema.index({ status: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ teamId: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ 'attachments.uploadedBy': 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
