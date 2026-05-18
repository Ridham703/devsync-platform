import Task from '../models/Task.js';

export const canMoveTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const role = user.role?.toLowerCase() || 'visitor';

    const isAdmin = role === 'admin';
    const isManager = role === 'manager';

    // 1. App-wide super admin: Full unrestricted access
    if (isAdmin) return next();

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
        const isTeamAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isTeamAdmin;
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

    // "Ensure Admin, Manager, and assigned members can move tasks. Prevent non-assigned members from moving."
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'Only Admin, Manager, or the assigned member can move this task' });
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

    const role = user.role?.toLowerCase() || 'visitor';

    const isAdmin = role === 'admin';
    const isManager = role === 'manager';

    // 1. App-wide super admin / manager: Full access
    if (isAdmin || isManager) return next();

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
        const isTeamAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isTeamAdmin;
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

    const role = user.role?.toLowerCase() || 'visitor';
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';

    // 1. App-wide super admin/manager: Full access
    if (isAdmin || isManager) return next();

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // 2. Check if user is the creator of the task
    const isCreator = task.createdBy && (task.createdBy.toString() === user._id.toString());
    if (isCreator) return next();

    // 3. Check if user is the assigned member
    let isAssignee = false;
    const currentUserId = user._id.toString();
    if (Array.isArray(task.assignedTo)) {
      isAssignee = task.assignedTo.some(a => a.toString() === currentUserId);
    } else {
      isAssignee = task.assignedTo?.toString() === currentUserId;
    }
    if (isAssignee) return next();

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
        const isTeamAdmin = member && member.role === 'admin';
        isTeamAdminOrOwner = isOwner || isTeamAdmin;
      }
    }

    // 4. Team admin/owner: Full access
    if (isTeamAdminOrOwner) return next();

    return res.status(403).json({ message: 'Only creator, assignee, team admins, or app admins/managers can delete this task' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
