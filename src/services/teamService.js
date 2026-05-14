const API_URL = 'http://localhost:5000/api/teams';

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem('devsync_user'));
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.token}`
  };
};

export const teamService = {
  getTeams: async () => {
    const response = await fetch(`${API_URL}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  },

  getInvitations: async () => {
    const response = await fetch(`${API_URL}/invitations`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch invitations');
    return response.json();
  },

  getTeam: async (id) => {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  },

  createTeam: async (teamData) => {
    const response = await fetch(`${API_URL}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData)
    });
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  },

  inviteMember: async (teamId, email) => {
    const response = await fetch(`${API_URL}/${teamId}/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to invite member');
    return data;
  },

  joinTeam: async (teamId) => {
    const response = await fetch(`${API_URL}/${teamId}/join`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to join team');
    return data;
  },

  updateMemberRole: async (teamId, userId, role) => {
    const response = await fetch(`${API_URL}/${teamId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update role');
    return data;
  },

  deleteTeam: async (teamId) => {
    const response = await fetch(`${API_URL}/${teamId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete team');
    return data;
  },

  removeMember: async (teamId, userId) => {
    const response = await fetch(`${API_URL}/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to remove member');
    return data;
  },

  declineInvitation: async (teamId) => {
    const response = await fetch(`${API_URL}/${teamId}/decline`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to decline invitation');
    return data;
  }
};
