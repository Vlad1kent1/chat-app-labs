import { axiosInstance } from '@services/api/axiosInstance';
import type { User } from '@types';

interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export async function login(payload: AuthPayload): Promise<AuthResponse> {
  const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', payload);
  return response.data.data;
}

export async function register(payload: AuthPayload): Promise<AuthResponse> {
  const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', payload);
  return response.data.data;
}
