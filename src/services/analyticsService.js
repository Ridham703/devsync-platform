import api from './api';

export const getStatsSummary = async (projectId = 'all') => {
  const response = await api.get(`/analytics/summary?projectId=${projectId}`);
  return response.data;
};

export const getVelocity = async (filter = 'week', projectId = 'all') => {
  const response = await api.get(`/analytics/velocity?filter=${filter}&projectId=${projectId}`);
  return response.data;
};

export const getLeaderboard = async () => {
  const response = await api.get('/analytics/leaderboard');
  return response.data;
};

const analyticsService = {
  getStatsSummary,
  getVelocity,
  getLeaderboard
};

export default analyticsService;
