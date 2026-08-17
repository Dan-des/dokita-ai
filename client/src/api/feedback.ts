import { apiClient } from './client';
import { Feedback } from '../types';

export const submitFeedback = async (data: {
  rating: number;
  comment: string;
}): Promise<{
  success: boolean;
  message: string;
  feedback: Feedback;
}> => {
  const response = await apiClient.post('/feedback', data);
  return response.data;
};

export const getFeedbacks = async (): Promise<{
  success: boolean;
  count: number;
  averageRating: number;
  feedbacks: Feedback[];
}> => {
  const response = await apiClient.get('/feedback');
  return response.data;
};
