import api from './api';

export const getChannelMessages = async (channelName, teamId = null) => {
  const url = teamId ? `/messages/${channelName}?teamId=${teamId}` : `/messages/${channelName}`;
  const response = await api.get(url);
  return response.data;
};

export const saveMessageRest = async (messagePayload) => {
  const response = await api.post('/messages', messagePayload);
  return response.data;
};

export const clearChat = async (teamId) => {
  const response = await api.delete(`/messages/team/${teamId}`);
  return response.data;
};

const chatService = {
  getChannelMessages,
  saveMessageRest,
  clearChat
};

export default chatService;
