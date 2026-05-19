import express from 'express';
import { getActivities, triggerActivity, getActivityAnalytics } from '../controllers/activityController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/activities - Retrieve dynamic/live activity list
router.get('/', protect, getActivities);

// GET /api/activities/analytics - Retrieve last 7 days metrics
router.get('/analytics', protect, getActivityAnalytics);

// POST /api/activities/trigger - Trigger simulated/external activities (PR, Deployments, Issues)
router.post('/trigger', protect, triggerActivity);

export default router;
