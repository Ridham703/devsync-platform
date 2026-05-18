import Task from '../models/Task.js';

export const canMoveTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    const user = req.user;

    let role = user.role?.toLowerCase() || 'assignment_man';
    if (role === 'developer' || role === 'member') role = 'assignment_man';
    if (role === 'guest' || role === 'viewer') role = 'visitor';

    // 1. App-wide super admin: Full unrestricted access
    if (role === 'admin') return next();

    // 2. Visitor: Strict read-only
    if (role === 'visitor') {
      return res.status(403).json({ message: 'Visitors have read-only access' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Determine if user is a team admin or team owner
    let isTeamAdminOrOwner = false;
    let teamId = task.teamId;
    if (!teamId && task.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(task.projectId);
      if (project) {
        teamId = project.team;
      }
    }

    if (teamId) {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findById(teamId);
      if (team) {
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isAdmin;
      }
    }

    // 3. Team admin/owner: Full access to move any task
    if (isTeamAdminOrOwner) return next();

    // 4. Check if user is the assigned member
    let isAssignee = false;
    const currentUserId = user._id.toString();
    if (Array.isArray(task.assignedTo)) {
      isAssignee = task.assignedTo.some(a => a.toString() === currentUserId);
    } else {
      isAssignee = task.assignedTo?.toString() === currentUserId;
    }

    // "Non-assigned users cannot drag, move, or change task status."
    if (!isAssignee) {
      return res.status(403).json({ message: 'Only the assigned member or team admins can move this task' });
    }

    // "Only the assigned member can move or update their assigned task... but only team admin can transition tasks to DONE"
    if (newStatus === 'DONE' && teamId) {
      return res.status(403).json({ message: 'Only team admins or owners can move tasks to DONE' });
    }

    return next();
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

    // 1. App-wide super admin: Full access
    if (role === 'admin') return next();

    // 2. Visitor: Strict read-only
    if (role === 'visitor') {
      return res.status(403).json({ message: 'Visitors have read-only access' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Determine if user is a team admin or team owner
    let isTeamAdminOrOwner = false;
    let teamId = task.teamId;
    if (!teamId && task.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(task.projectId);
      if (project) {
        teamId = project.team;
      }
    }

    if (teamId) {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findById(teamId);
      if (team) {
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isAdmin;
      }
    }

    // 3. Team admin/owner: Full access to edit any task
    if (isTeamAdminOrOwner) return next();

    // 4. Check if user is the assigned member
    let isAssignee = false;
    const currentUserId = user._id.toString();
    if (Array.isArray(task.assignedTo)) {
      isAssignee = task.assignedTo.some(a => a.toString() === currentUserId);
    } else {
      isAssignee = task.assignedTo?.toString() === currentUserId;
    }

    // "Only the assigned member can move or update their assigned task."
    if (isAssignee) return next();

    return res.status(403).json({ message: 'Only the assigned member or team admins can edit this task' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const canDeleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let role = user.role?.toLowerCase() || 'assignment_man';
    if (role === 'developer' || role === 'member') role = 'assignment_man';
    if (role === 'guest' || role === 'viewer') role = 'visitor';

    // 1. App-wide super admin: Full access
    if (role === 'admin') return next();

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Determine if user is a team admin or team owner
    let isTeamAdminOrOwner = false;
    let teamId = task.teamId;
    if (!teamId && task.projectId) {
      const Project = (await import('../models/Project.js')).default;
      const project = await Project.findById(task.projectId);
      if (project) {
        teamId = project.team;
      }
    }

    if (teamId) {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findById(teamId);
      if (team) {
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isAdmin;
      }
    }

    // "Team admin/owner has full access to move, edit, or delete any task."
    if (isTeamAdminOrOwner) return next();

    return res.status(403).json({ message: 'Only team admins or app admins can delete tasks' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
