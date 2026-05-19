import api from './api';

export const analyticsService = {
  getDashboardAnalytics: async () => {
    const res = await api.get('/analytics');
    return res.data;
  },
  getStatsSummary: async (timeFilter = 'week', projectFilter = 'all') => {
    const res = await api.get(`/analytics/summary?timeFilter=${timeFilter}&projectFilter=${projectFilter}`);
    return res.data;
  },
  getVelocity: async (timeFilter = 'week', projectFilter = 'all') => {
    const res = await api.get(`/analytics/velocity?timeFilter=${timeFilter}&projectFilter=${projectFilter}`);
    return res.data;
  },
  getLeaderboard: async (timeFilter = 'week', projectFilter = 'all') => {
    const res = await api.get(`/analytics/leaderboard?timeFilter=${timeFilter}&projectFilter=${projectFilter}`);
    return res.data;
  }
};

export default analyticsService;
