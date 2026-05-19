import Activity from '../models/Activity.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

/**
 * Logs a dynamic activity to the database and broadcasts it via Socket.IO
 * @param {object} io - The Socket.IO server instance
 * @param {object} data - Activity payload (user, actionType, message, target, projectId, teamId, metadata)
 */
export const logActivity = async (io, { user, actionType, message, target, projectId, teamId, metadata }) => {
  try {
    let resolvedTeamId = teamId || null;

    // Automatically resolve teamId from projectId if it's missing but a projectId is supplied
    if (!resolvedTeamId && projectId) {
      try {
        const project = await Project.findById(projectId);
        if (project && project.team) {
          resolvedTeamId = project.team;
        }
      } catch (err) {
        console.warn('[ActivityLogger] Failed to resolve teamId from projectId:', err.message);
      }
    }

    const activity = await Activity.create({
      user,
      actionType,
      message,
      target: target || '',
      projectId: projectId || null,
      teamId: resolvedTeamId,
      metadata: metadata || null
    });

    const populated = await Activity.findById(activity._id)
      .populate('user', 'username email avatar')
      .populate('projectId', 'name color')
      .populate('teamId', 'name');

    if (io) {
      // 1. Broadcast standard live streams
      io.emit('new-activity', populated);
      io.emit('activity-updated');
      io.emit('dashboard-analytics-updated');
      io.emit('analytics-updated');

      // 2. Aggregate and broadcast real-time Workflow Velocity updates!
      try {
        const daysToFetch = 7;
        const startOfPeriod = new Date();
        startOfPeriod.setDate(startOfPeriod.getDate() - (daysToFetch - 1));
        startOfPeriod.setHours(0, 0, 0, 0);

        const completedTasksByDay = await Task.aggregate([
          {
            $match: {
              status: 'DONE',
              completedAt: { $gte: startOfPeriod }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
              count: { $sum: 1 }
            }
          }
        ]);

        const timeline = [];
        const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = daysToFetch - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          timeline.push({
            date: `${dayNamesShort[d.getDay()]} ${d.getDate()}`,
            key: dateStr,
            tasks: 0
          });
        }

        completedTasksByDay.forEach(item => {
          const target = timeline.find(t => t.key === item._id);
          if (target) {
            target.tasks = item.count;
          }
        });

        const finalVelocityArray = timeline.map(t => ({ date: t.date, day: t.date, tasks: t.tasks }));
        const totalCompleted = finalVelocityArray.reduce((acc, curr) => acc + curr.tasks, 0);

        // Broadcast payload directly satisfying frontend signatures
        io.emit('workflow-velocity-updated', {
          hasRealData: totalCompleted > 0,
          data: finalVelocityArray
        });
      } catch (err) {
        console.error('[ActivityLogger] Failed to aggregate realtime velocity broadcast:', err);
      }
    } else {
      console.warn('[ActivityLogger] Socket.IO instance not provided, skipping realtime broadcast.');
    }

    return populated;
  } catch (error) {
    console.error('[ActivityLogger] Error creating activity log:', error);
  }
};
