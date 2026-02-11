/**
 * Auth Slice
 * Purpose: Manages authentication state (user, token, auth status)
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface User {
  id: number;
  branchId: number;
  branchName?: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  ipAddress: string | null;
  lastLogin: string;
  loginType: string;
  otp: string | null;
  otpExpire: string | null;
  status: string;
  previousEntryPermission: string | null;
  permissionDate: string | null;
  revenueStatus: string;
  dutyAdminEmp: string;
  dialerUsername: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  groupId: number | null;
  groupName: string | null;
  groups: unknown[];
}

export interface LoginResponseData {
  user: User;
  login_type: string;
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthState {
  loginData: LoginResponseData | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  loginData: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponseData>) => {
      state.loginData = action.payload;
      state.isAuthenticated = true;

      // Also save to localStorage for backward compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", action.payload.access_token);
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        localStorage.setItem("tokenType", action.payload.token_type);
        localStorage.setItem("loginType", action.payload.login_type);
        localStorage.setItem("expiresIn", action.payload.expires_in.toString());
        localStorage.setItem("loginData", JSON.stringify(action.payload));
      }
    },
    logout: (state) => {
      state.loginData = null;
      state.isAuthenticated = false;

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenType");
        localStorage.removeItem("loginType");
        localStorage.removeItem("expiresIn");
        localStorage.removeItem("loginData");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("user");
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

// Selectors
export const selectLoginData = (state: RootState) => state.auth.loginData;
export const selectUser = (state: RootState) => state.auth.loginData?.user ?? null;
export const selectToken = (state: RootState) => state.auth.loginData?.access_token ?? null;
export const selectTokenType = (state: RootState) => state.auth.loginData?.token_type ?? null;
export const selectLoginType = (state: RootState) => state.auth.loginData?.login_type ?? null;
export const selectExpiresIn = (state: RootState) => state.auth.loginData?.expires_in ?? null;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUserId = (state: RootState) => state.auth.loginData?.user?.id;
export const selectUserBranchId = (state: RootState) => state.auth.loginData?.user?.branchId;
export const selectUserEmail = (state: RootState) => state.auth.loginData?.user?.email;
export const selectUserName = (state: RootState) => state.auth.loginData?.user?.name;
export const selectUserGroupName = (state: RootState) => state.auth.loginData?.user?.groupName;
export const selectUserBranchName = (state: RootState) => state.auth.loginData?.user?.branchName ?? null;

export default authSlice.reducer;

