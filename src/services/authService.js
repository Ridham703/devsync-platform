import api from './api';

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.data && response.data.token) {
    localStorage.setItem('devsync_token', response.data.token);
    localStorage.setItem('devsync_user', JSON.stringify(response.data));
  }
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  if (response.data && response.data.token) {
    localStorage.setItem('devsync_token', response.data.token);
    localStorage.setItem('devsync_user', JSON.stringify(response.data));
  }
  return response.data;
};

export const logoutUser = () => {
  localStorage.removeItem('devsync_token');
  localStorage.removeItem('devsync_user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('devsync_user');
  return user ? JSON.parse(user) : null;
};

export const checkUser = async (email) => {
  const response = await api.post('/auth/check-user', { email });
  return response.data;
};

export const resetPassword = async (email, newPassword) => {
  const response = await api.post('/auth/reset-password', { email, newPassword });
  return response.data;
};

const authService = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  checkUser,
  resetPassword
};

export default authService;
