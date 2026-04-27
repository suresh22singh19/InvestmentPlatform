/**
 * Axios HTTP Client
 * Purpose: Configured axios instance for API calls
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config/api";
import { getVisitClientIp } from "@/lib/api/clientVisitIp";

/**
 * Handle 401 — invalid/expired session. Do not logout on 403; that often means
 * permission denied while the JWT is still valid.
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

function shouldSkipAxiosLogoutForLikelyPermission401(message: string): boolean {
  const m = message.toLowerCase().trim();
  if (!m) return false;
  if (
    m.includes("token") ||
    m.includes("jwt") ||
    m.includes("expired") ||
    m.includes("invalid credential")
  ) {
    return false;
  }
  return (
    m.includes("permission") ||
    m.includes("forbidden") ||
    m.includes("access denied") ||
    m.includes("not allowed") ||
    m.includes("do not have access") ||
    m.includes("does not have access")
  );
}

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

  // Request Interceptor - Add token and visitor IP (for login / all API calls in browser)
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const visitIp = await getVisitClientIp();
        if (visitIp && config.headers) {
          config.headers["x-forwarded-for"] = visitIp;
        }
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor - Handle 401 (token expired or unauthorized)
  // API returns: { data: null, message: "Invalid or expired token", statusCode: 401, timestamp: "..." }
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const bodyStatus = (error.response?.data as { statusCode?: number })?.statusCode;
      const isUnauthorized = status === 401 || bodyStatus === 401;
      const data = error.response?.data as { message?: string | string[] } | undefined;
      const rawMsg = data?.message;
      const msgStr = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
      const messageText = typeof msgStr === "string" ? msgStr : "";

      const cfg = error.config;
      const combined =
        cfg?.baseURL && cfg?.url
          ? `${String(cfg.baseURL).replace(/\/$/, "")}/${String(cfg.url).replace(/^\//, "")}`
          : cfg?.url || "";
      const isPublicAuth =
        /\/auth\/login(\/|\?|$)/i.test(combined) ||
        /\/auth\/forgot-password(\/|\?|$)/i.test(combined) ||
        /\/auth\/reset-password(\/|\?|$)/i.test(combined);

      if (
        isUnauthorized &&
        !isPublicAuth &&
        !shouldSkipAxiosLogoutForLikelyPermission401(messageText)
      ) {
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

