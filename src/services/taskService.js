import api from './api';

export const getAllTasks = async () => {
  const response = await api.get('/tasks');
  return response.data;
};

export const createNewTask = async (taskPayload) => {
  const response = await api.post('/tasks', taskPayload);
  return response.data;
};

export const updateTaskDetails = async (taskId, updates) => {
  const response = await api.patch(`/tasks/${taskId}`, updates);
  return response.data;
};

export const deleteTaskById = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

export const getComments = async (taskId) => {
  const response = await api.get(`/comments/task/${taskId}`);
  return response.data;
};

export const addComment = async (taskId, content) => {
  const response = await api.post(`/comments`, { taskId, content });
  return response.data;
};

export const getActivityLogs = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/activity`);
  return response.data;
};

export const uploadAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

const taskService = {
  getAllTasks,
  createNewTask,
  updateTaskDetails,
  deleteTaskById,
  getComments,
  addComment,
  getActivityLogs,
  uploadAttachment
};

export default taskService;
