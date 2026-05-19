import express from 'express';
import { 
  getDashboardAnalytics,
  getStatsSummary,
  getVelocity,
  getLeaderboard
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics - Get dynamic dashboard metrics
router.get('/', protect, getDashboardAnalytics);

// GET /api/analytics/summary - Get summary stats cards
router.get('/summary', protect, getStatsSummary);

// GET /api/analytics/velocity - Get workflow velocity chart
router.get('/velocity', protect, getVelocity);

// GET /api/analytics/leaderboard - Get dynamic leaderboard rankings
router.get('/leaderboard', protect, getLeaderboard);

export default router;
