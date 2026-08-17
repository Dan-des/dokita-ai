import { apiClient } from './client';
import { ChatMessage, ChatSession } from '../types';

export const askTriage = async (data: {
  prompt: string;
  sessionId?: string;
  conversationHistory?: ChatMessage[];
  location?: { lat: number; lng: number };
}): Promise<{
  success: boolean;
  sessionId: string;
  message: ChatMessage;
}> => {
  const response = await apiClient.post('/chat/ask', data);
  return response.data;
};

export const getChatSessions = async (): Promise<{
  success: boolean;
  sessions: ChatSession[];
}> => {
  const response = await apiClient.get('/chat/sessions');
  return response.data;
};

export const getSessionById = async (sessionId: string): Promise<{
  success: boolean;
  session: ChatSession;
}> => {
  const response = await apiClient.get(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const deleteChatSession = async (sessionId: string): Promise<{
  success: boolean;
  message: string;
  sessionId: string;
}> => {
  const response = await apiClient.delete(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const clearAllChatSessions = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.delete('/chat/sessions');
  return response.data;
};
