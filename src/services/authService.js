import api from './api';

export const registerUser = async (userData) => {
  // Expects { username, email, password, otp }
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

export const sendOtp = async (email, type) => {
  const response = await api.post('/auth/send-otp', { email, type });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await api.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};

const authService = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  sendOtp,
  resetPassword
};

export default authService;
