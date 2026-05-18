import api from './api';

export const teamService = {
  getTeams: async () => {
    const response = await api.get('/teams');
    return response.data;
  },

  getInvitations: async () => {
    const response = await api.get('/teams/invitations');
    return response.data;
  },

  getTeam: async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  createTeam: async (teamData) => {
    const response = await api.post('/teams', teamData);
    return response.data;
  },

  inviteMember: async (teamId, email) => {
    try {
      const response = await api.post(`/teams/${teamId}/invite`, { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to invite member');
    }
  },

  joinTeam: async (teamId) => {
    try {
      const response = await api.post(`/teams/${teamId}/join`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to join team');
    }
  },

  updateMemberRole: async (teamId, userId, role) => {
    try {
      const response = await api.patch(`/teams/${teamId}/members/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update role');
    }
  },

  deleteTeam: async (teamId) => {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete team');
    }
  },

  removeMember: async (teamId, userId) => {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove member');
    }
  },

  declineInvitation: async (teamId) => {
    try {
      const response = await api.post(`/teams/${teamId}/decline`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to decline invitation');
    }
  }
};

export default teamService;
