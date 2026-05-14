import Task from '../models/Task.js';

export const canMoveTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    const user = req.user;

    let role = user.role?.toLowerCase() || 'assignment_man';
    if (role === 'developer' || role === 'member') role = 'assignment_man';
    if (role === 'guest' || role === 'viewer') role = 'visitor';

    // 1. ADMIN: Full unrestricted access
    if (role === 'admin') return next();

    // 2. VISITOR: Strict read-only
    if (role === 'visitor') {
      return res.status(403).json({ message: 'Visitors have read-only access' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // 3. MANAGER: Can move team tasks
    if (role === 'manager') return next();

    // 4. ASSIGNMENT MAN: Limited Control
    if (role === 'assignment_man') {
      let isAssignee = false;
      const currentUserId = user._id.toString();
      
      if (Array.isArray(task.assignedTo)) {
        isAssignee = task.assignedTo.some(a => a.toString() === currentUserId);
      } else {
        isAssignee = task.assignedTo?.toString() === currentUserId;
      }
      
      const isOwner = task.createdBy?.toString() === currentUserId;
      
      if (!isAssignee && !isOwner) {
        return res.status(403).json({ message: 'Assignment Man can only move tasks assigned to or created by them' });
      }

      if (!newStatus) return next();

      // Transition Rules
      const allowedTransitions = {
        'TODO': ['IN_PROGRESS'],
        'IN_PROGRESS': ['UNDER_REVIEW'],
        'UNDER_REVIEW': [] // Cannot move out of review to 'done'
      };

      const currentStatus = task.status;
      const allowedNext = allowedTransitions[currentStatus] || [];

      if (!allowedNext.includes(newStatus)) {
        return res.status(403).json({ message: `Assignment Man cannot move task from ${currentStatus} to ${newStatus}` });
      }

      return next();
    }

    return res.status(403).json({ message: 'Unauthorized role' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const canEditTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let role = user.role?.toLowerCase() || 'assignment_man';
    if (role === 'developer' || role === 'member') role = 'assignment_man';
    if (role === 'guest' || role === 'viewer') role = 'visitor';

    if (role === 'admin' || role === 'manager') return next();

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isOwner = task.createdBy?.toString() === user._id.toString();
    
    let isAssignee = false;
    const currentUserId = user._id.toString();
    if (Array.isArray(task.assignedTo)) {
      isAssignee = task.assignedTo.some(a => a.toString() === currentUserId);
    } else {
      isAssignee = task.assignedTo?.toString() === currentUserId;
    }
    
    if (role === 'assignment_man') {
      if (isAssignee || isOwner) return next();
      return res.status(403).json({ message: 'You can only edit tasks assigned to you' });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const canDeleteTask = async (req, res, next) => {
  let role = req.user.role?.toLowerCase() || 'visitor';
  if (role === 'developer' || role === 'member') role = 'assignment_man';
  
  if (role === 'admin') return next();
  return res.status(403).json({ message: 'Only Admins can delete tasks' });
};
