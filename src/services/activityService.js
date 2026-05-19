import api from './api';

export const activityService = {
  // Fetch paginated and filtered activities
  getActivities: async (params) => {
    const res = await api.get('/activities', { params });
    return res.data;
  },

  // Trigger a simulated activity (PR, deployment, issues)
  triggerActivity: async (activityData) => {
    const res = await api.post('/activities/trigger', activityData);
    return res.data;
  },

  // Fetch activity analytics for the last 7 days
  getActivityAnalytics: async () => {
    const res = await api.get('/activities/analytics');
    return res.data;
  }
};
