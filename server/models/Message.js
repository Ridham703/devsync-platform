import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  user: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  initial: { 
    type: String, 
    default: '?' 
  },
  color: { 
    type: String, 
    default: 'from-primary to-purple-600' 
  },
  text: { 
    type: String, 
    required: [true, 'Message text cannot be empty'] 
  },
  channel: { 
    type: String, 
    default: 'general' 
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  isCode: { 
    type: Boolean, 
    default: false 
  },
  code: { 
    type: String, 
    default: '' 
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
