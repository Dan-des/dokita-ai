import { apiClient } from './client';
import { Hospital } from '../types';

export const getHospitals = async (params?: {
  city?: string;
  state?: string;
  search?: string;
  is24Hours?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<{
  success: boolean;
  count: number;
  userLocation?: { lat: number; lng: number } | null;
  hospitals: Hospital[];
}> => {
  const response = await apiClient.get('/hospitals', { params });
  return response.data;
};

export const getLiveNearbyHospitals = async (params: {
  lat: number;
  lng: number;
  radius?: number;
}): Promise<{
  success: boolean;
  count: number;
  userLocation: { lat: number; lng: number };
  radiusKm: number;
  hospitals: Hospital[];
}> => {
  const response = await apiClient.get('/hospitals/nearby', { params });
  return response.data;
};

export const createHospital = async (data: {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  is24Hours: boolean;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<{
  success: boolean;
  message: string;
  hospital: Hospital;
}> => {
  const response = await apiClient.post('/hospitals', data);
  return response.data;
};

export const deleteHospital = async (id: string): Promise<{
  success: boolean;
  message: string;
  id: string;
}> => {
  const response = await apiClient.delete(`/hospitals/${id}`);
  return response.data;
};
