import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Creates an Axios instance with pre-configured defaults
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor: Attach JWT token from Cognito
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // User might not be authenticated - let request proceed without token
        console.warn('Unable to fetch auth session:', error);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor: Handle common errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            console.error('Unauthorized - redirecting to login');
            // Optionally trigger a logout or redirect
            window.location.href = '/login';
            break;
          case 403:
            console.error('Forbidden - insufficient permissions');
            break;
          case 404:
            console.error('Resource not found');
            break;
          case 500:
            console.error('Server error:', data?.message || 'Unknown error');
            break;
          default:
            console.error(`HTTP Error ${status}:`, data?.message);
        }
      } else if (error.request) {
        console.error('Network error - no response received');
      } else {
        console.error('Request configuration error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

export default apiClient;
