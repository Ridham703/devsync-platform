const API_URL = 'http://localhost:5000/api/projects';

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem('devsync_user'));
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.token}`
  };
};

export const projectService = {
  getProjects: async () => {
    const response = await fetch(`${API_URL}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getTeamProjects: async (teamId) => {
    const response = await fetch(`${API_URL}/team/${teamId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch team projects');
    return response.json();
  },

  createProject: async (projectData) => {
    const response = await fetch(`${API_URL}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  }
};

export default projectService;
