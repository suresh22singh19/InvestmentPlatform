/**
 * API Helper Utilities
 * Purpose: Reusable functions for API endpoints to access Redux state and storage
 */

import type { RootState } from "../index";

/**
 * Get user ID from Redux state or localStorage/sessionStorage
 */
export const getUserId = (state?: RootState): number | null => {
  // Try Redux state first
  if (state?.auth?.loginData?.user?.id) {
    return state.auth.loginData.user.id;
  }

  // Fallback to localStorage/sessionStorage
  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user?.id || null;
      }
    } catch (e) {
      console.error("Error parsing user from storage:", e);
    }
  }

  return null;
};

/**
 * Get auth token from Redux state or localStorage/sessionStorage
 */
export const getAuthToken = (state?: RootState): string | null => {
  // Try Redux state first
  if (state?.auth?.loginData?.access_token) {
    return state.auth.loginData.access_token;
  }

  // Fallback to localStorage/sessionStorage
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  }

  return null;
};

/**
 * Get stored user object from localStorage/sessionStorage
 */
export const getStoredUser = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("user") || sessionStorage.getItem("user");
  }
  return null;
};

