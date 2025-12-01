/**
 * Axios HTTP Client
 * Purpose: Configured axios instance for API calls
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config/api";

/**
 * Handle 401 Unauthorized - Auto logout
 */
const handleUnauthorized = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("user");
    window.location.href = "/";
  }
};

/**
 * Create Axios Instance
 * Purpose: Axios instance with base URL, interceptors for token and 401 handling
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  // Request Interceptor - Add token to headers
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor - Handle 401 errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Export axios instance
export const apiClient = createAxiosInstance();
export default apiClient;

