import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  adminKey?: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const getMe = async (): Promise<{ success: boolean; user: User }> => {
  const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
  return response.data;
};
