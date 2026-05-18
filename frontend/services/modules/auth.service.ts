import axios, { type AxiosError } from 'axios';
import { axiosInstance } from '@services/api/axiosInstance';
import type { User } from '@types';

interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

interface SendOtpPayload {
  email: string;
  type: 'REGISTER' | 'RESET';
}

interface VerifyOtpPayload {
  email: string;
  code: string;
  type: 'REGISTER' | 'RESET';
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  password: string;
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

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      message?: string | string[];
      error?: string;
    }>;
    const responseData = axiosError.response?.data;
    const message = responseData?.message ?? responseData?.error;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof responseData === 'string') {
      return responseData;
    }

    return axiosError.message ?? 'An unexpected error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const requestBody: { email?: string; phone?: string; password: string } = {
      password: payload.password,
    };

    if (payload.email) {
      requestBody.email = payload.email;
    }

    if (payload.phone) {
      requestBody.phone = payload.phone;
    }

    const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', requestBody);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function register(payload: RegisterPayload): Promise<void> {
  try {
    await axiosInstance.post<ApiResponse<null>>('/auth/register', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await axiosInstance.post<ApiResponse<null>>('/auth/forgot-password', { email });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function sendOtp(email: string, type: 'REGISTER' | 'RESET'): Promise<void> {
  try {
    await axiosInstance.post<ApiResponse<null>>('/auth/send-otp', { email, type } as SendOtpPayload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function verifyOtp(email: string, code: string, type: 'REGISTER' | 'RESET'): Promise<void> {
  try {
    await axiosInstance.post<ApiResponse<null>>('/auth/verify-otp', { email, code, type } as VerifyOtpPayload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function resetPassword(data: ResetPasswordDto): Promise<void> {
  try {
    await axiosInstance.post<ApiResponse<null>>('/auth/reset-password', data);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Update user profile information.
 * Requires authentication (JWT token in header).
 *
 * @param profileData - Object containing profile fields to update
 * @returns Promise resolving to updated user object
 */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export async function updateProfile(
  profileData: UpdateProfilePayload, 
  token?: string | null 
): Promise<any> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    
    const response = await axiosInstance.patch<ApiResponse<User>>('/users/profile', profileData, config);
    return response.data.data as User;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Delete user account permanently.
 * Requires authentication (JWT token in header).
 *
 * @returns Promise resolving to void
 */
export async function deleteAccount(token?: string | null): Promise<void> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    await axiosInstance.delete<ApiResponse<null>>('/users/profile', config);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
