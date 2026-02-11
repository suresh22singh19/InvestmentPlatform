/**
 * Auth API
 * Purpose: Login API endpoint using RTK Query
 */

import { baseApi } from "./baseApi";

interface LoginRequest {
  // login_type: string;
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    user: {
      id: number;
      branchId: number;
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
    };
    login_type: string;
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

interface ForgotPasswordRequest {
  // login_type: string;
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    email: string;
    // login_type: string;
    otp: string;
    otpExpiresAt: string;
    expires_in: number;
  };
}

interface ResetPasswordRequest {
  email: string;
  // login_type: string;
  password: string;
  confirm_password: string;
  token: string;
}

interface ResetPasswordResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data?: unknown;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),
    forgotPassword: builder.mutation<
      ForgotPasswordResponse,
      ForgotPasswordRequest
    >({
      query: (payload) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: payload,
      }),
    }),
    resetPassword: builder.mutation<
      ResetPasswordResponse,
      ResetPasswordRequest
    >({
      query: (payload) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;

