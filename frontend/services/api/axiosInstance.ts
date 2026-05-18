import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosRequestHeaders,
} from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const defaultBaseURL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? defaultBaseURL;

export const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync('authToken');

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      } as AxiosRequestHeaders;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[AXIOS] 401 Unauthorized - clearing auth state');
      SecureStore.deleteItemAsync('authToken');
      SecureStore.deleteItemAsync('authUser');
    }
    return Promise.reject(error);
  },
);
