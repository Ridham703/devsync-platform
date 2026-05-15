import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';

// @desc    Get all tasks
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ updatedAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Could not fetch tasks' });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  const { title, description, status, tag, priority, projectId, assignedTo } = req.body;

  try {
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const newTask = new Task({
      title,
      description,
      status: status || 'TODO',
      tag: tag || 'Feature',
      priority: priority || 'Medium',
      projectId: (projectId && projectId.trim() !== '') ? projectId : undefined,
      assignedTo: (assignedTo && Array.isArray(assignedTo)) ? assignedTo.filter(id => id && id.trim() !== '') : [],
      createdBy: req.user._id
    });

    const savedTask = await newTask.save();

    // Create Activity Log
    await ActivityLog.create({
      task: savedTask._id,
      user: req.user._id,
      action: 'TASK_CREATED',
      to: savedTask.status,
      details: `Task "${savedTask.title}" created`
    });

    // Trigger Notification for assignment
    if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
      const firstAssignee = assignedTo[0];
      if (firstAssignee.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          sender: req.user._id,
          receiver: firstAssignee,
          type: 'TASK_ASSIGNED',
          message: `${req.user.username} assigned you a task: ${title}`,
          relatedId: savedTask._id,
          link: '/kanban'
        });

        const io = req.app.get('io');
        if (io) {
          io.to(firstAssignee.toString()).emit('notification:new', {
            ...notification._doc,
            sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
          });
        }
      }
    }

    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Could not create task' });
  }
};

// @desc    Update existing task/status
// @route   PATCH /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo;

    // Update allowable fields
    const updates = ['title', 'description', 'status', 'tag', 'priority', 'projectId', 'assignedTo'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'projectId' && req.body[field] === '') {
          task[field] = undefined;
        } else if (field === 'assignedTo' && Array.isArray(req.body[field])) {
          task[field] = req.body[field].filter(id => id && id.trim() !== '');
        } else {
          task[field] = req.body[field];
        }
      }
    });

    if (req.body.status === 'DONE' && oldStatus !== 'DONE') {
      task.completedAt = new Date();
    } else if (req.body.status && req.body.status !== 'DONE') {
      task.completedAt = null;
    }

    const updatedTask = await task.save();

    // Create Activity Log for Status Change
    if (req.body.status && req.body.status !== oldStatus) {
      await ActivityLog.create({
        task: updatedTask._id,
        user: req.user._id,
        action: 'STATUS_CHANGE',
        from: oldStatus,
        to: updatedTask.status,
        details: `Moved task from ${oldStatus} to ${updatedTask.status}`
      });
    }

    // Trigger Notifications
    const io = req.app.get('io');
    if (io) {
      // Notification for Status Change
      if (req.body.status && req.body.status !== oldStatus) {
        const recipients = new Set();
        if (updatedTask.assignedTo && Array.isArray(updatedTask.assignedTo)) {
          updatedTask.assignedTo.forEach(a => {
            if (a) recipients.add(a.toString());
          });
        }
        
        for (const recipientId of recipients) {
          if (recipientId !== req.user._id.toString()) {
            const notification = await Notification.create({
              sender: req.user._id,
              receiver: recipientId,
              type: 'TASK_STATUS_CHANGE',
              message: `${req.user.username} moved task "${updatedTask.title}" to ${updatedTask.status}`,
              relatedId: updatedTask._id,
              link: '/kanban'
            });

            io.to(recipientId).emit('notification:new', {
              ...notification._doc,
              sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
            });
          }
        }
      }

      // Notification for New Assignment
      if (req.body.assignedTo && Array.isArray(req.body.assignedTo) && req.body.assignedTo.length > 0) {
        const newAssignee = req.body.assignedTo[0];
        const oldAssigneeId = oldAssignedTo && oldAssignedTo.length > 0 ? oldAssignedTo[0].toString() : '';
        
        if (newAssignee.toString() !== oldAssigneeId && newAssignee.toString() !== req.user._id.toString()) {
          const notification = await Notification.create({
            sender: req.user._id,
            receiver: newAssignee,
            type: 'TASK_ASSIGNED',
            message: `${req.user.username} assigned you a task: ${updatedTask.title}`,
            relatedId: updatedTask._id,
            link: '/kanban'
          });

          io.to(newAssignee.toString()).emit('notification:new', {
            ...notification._doc,
            sender: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar }
          });
        }
      }

      // Analytics Realtime Trigger
      if (req.body.status === 'DONE' && oldStatus !== 'DONE') {
        io.emit('task-completed', { taskId: updatedTask._id, userId: req.user._id });
      }
      io.emit('task-updated', { taskId: updatedTask._id, targetStatus: updatedTask.status });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Update operation failed' });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.deleteOne();
    res.json({ message: 'Task removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Delete operation failed' });
  }
};

// @desc    Get activity logs for a task
// @route   GET /api/tasks/:id/activity
export const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ task: req.params.id })
      .populate('user', 'username email avatar')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Could not fetch activity logs' });
  }
};

// @desc    Upload attachment to task
// @route   POST /api/tasks/:id/attachments
export const uploadAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `http://localhost:5000/uploads/attachments/${req.file.filename}`;
    
    const attachment = {
      url: fileUrl,
      filename: req.file.originalname,
      uploadedBy: req.user._id
    };

    task.attachments.push(attachment);
    await task.save();

    // Log the activity
    await ActivityLog.create({
      task: task._id,
      user: req.user._id,
      action: 'ATTACHMENT_ADDED',
      details: `Attached file: ${req.file.originalname}`
    });

    // Populate the newly added attachment's user info to return
    await task.populate('attachments.uploadedBy', 'username avatar');
    const newAttachment = task.attachments[task.attachments.length - 1];

    res.status(201).json(newAttachment);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: Attachment upload failed' });
  }
};
