import api from '../api/axios';

export function sendChatMessage(message, messages) {
  return api.post('/chat/message', { message, messages });
}
