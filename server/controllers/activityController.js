import Activity from '../models/Activity.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all activities (paginated and filtered)
// @route   GET /api/activities
export const getActivities = async (req, res) => {
  const { page = 1, limit = 20, teamId, projectId, actionType } = req.query;

  try {
    const filter = {};

    if (teamId && teamId !== 'undefined' && teamId !== 'null') {
      filter.teamId = teamId;
    }
    if (projectId && projectId !== 'undefined' && projectId !== 'null') {
      filter.projectId = projectId;
    }
    if (actionType && actionType !== 'All' && actionType !== '') {
      filter.actionType = actionType;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skipIndex = (pageNum - 1) * limitNum;

    const activities = await Activity.find(filter)
      .populate('user', 'username email avatar')
      .populate('projectId', 'name color')
      .populate('teamId', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skipIndex);

    const total = await Activity.countDocuments(filter);

    res.json({
      activities,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasMore: skipIndex + activities.length < total
    });
  } catch (error) {
    console.error('[ActivityController] Error fetching activities:', error);
    res.status(500).json({ message: 'Server Error: Could not fetch activities' });
  }
};

// @desc    Trigger simulated activity (PR_MERGED, DEPLOYMENT_STARTED, ISSUE_CREATED)
// @route   POST /api/activities/trigger
export const triggerActivity = async (req, res) => {
  const { actionType, message, target, projectId, teamId, metadata } = req.body;

  try {
    const validSimulatedTypes = ['PR_MERGED', 'DEPLOYMENT_STARTED', 'ISSUE_CREATED'];
    if (!validSimulatedTypes.includes(actionType)) {
      return res.status(400).json({ message: 'Invalid simulated action type' });
    }

    const io = req.app.get('io');
    const activity = await logActivity(io, {
      user: req.user._id,
      actionType,
      message,
      target,
      projectId,
      teamId,
      metadata
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('[ActivityController] Error triggering activity:', error);
    res.status(500).json({ message: 'Server Error: Triggering activity failed' });
  }
};

// @desc    Get activity analytics for the last 7 days
// @route   GET /api/activities/analytics
export const getActivityAnalytics = async (req, res) => {
  try {
    const startOfPeriod = new Date();
    startOfPeriod.setDate(startOfPeriod.getDate() - 6); // 7 days ending today
    startOfPeriod.setHours(0, 0, 0, 0);

    const aggregation = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPeriod }
        }
      },
      {
        $group: {
          _id: {
            $dayOfWeek: "$createdAt"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Build last 7 days chronologically
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        dayName: dayOfWeekNames[d.getDay()],
        dayIndex: d.getDay(),
        count: 0
      });
    }

    // Assign counts from aggregation
    aggregation.forEach(item => {
      const dayIndex = item._id - 1; // 0-based
      const target = last7Days.find(d => d.dayIndex === dayIndex);
      if (target) {
        target.count = item.count;
      }
    });

    // Check if there are any activities logged globally
    const totalActivitiesCount = await Activity.countDocuments();

    res.json({
      analytics: last7Days.map(d => ({
        day: d.dayName,
        count: d.count
      })),
      isPlaceholder: totalActivitiesCount === 0
    });
  } catch (error) {
    console.error('[ActivityController] Error fetching analytics:', error);
    res.status(500).json({ message: 'Server Error: Could not fetch analytics' });
  }
};
