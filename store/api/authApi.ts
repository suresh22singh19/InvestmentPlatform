/**
 * Auth API
 * Purpose: Login API endpoint using RTK Query
 */

import { baseApi } from "./baseApi";

export interface LoginRequest {
  email: string;
  password: string;
  /** Sent on the second step after `otpRequired` from the first `/auth/login` response. */
  otp?: string;
}

/** Nested module tree returned on each sub-module row (API may recurse). */
export type LoginPermissionNestedModule = {
  id: number;
  parentModuleId?: number;
  moduleName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  module?: LoginPermissionNestedModule;
};

export interface LoginUser {
  id: number;
  branchId: number;
  empId: string;
  name?: string;
  userName?: string;
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
  /** Omitted on some login payloads; treat as null when missing. */
  groupName?: string | null;
  groups?: unknown[];
  branchName?: string;
  roleCategoryType?: string;
  roleId?: number;
  /** Present in current login payload, e.g. `{ id, name }`. */
  role?: { id: number; name: string };
}

export interface LoginPermissionSubModule {
  /** Role-permission row id (numeric in current API). */
  id: string | number;
  parentModuleId: number;
  moduleName: string;
  isActive: boolean;
  roleId?: number;
  /** Catalog module id as string, e.g. `"1"`. */
  moduleId?: string;
  canDownload?: boolean;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  module?: LoginPermissionNestedModule;
}

export interface LoginPermissionModule {
  id: string | number;
  moduleName: string;
  isActive: boolean;
  canDownload?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | number | null;
  updatedBy?: string | number | null;
  subModules?: LoginPermissionSubModule[];
}

export interface LoginBranchAccess {
  id: number;
  name: string;
  type: string;
}

/** Successful login — token and user payload. */
export interface LoginSuccessData {
  user: LoginUser;
  permissions: LoginPermissionModule[];
  branch_access: LoginBranchAccess[];
  login_type: string;
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** First-step response: user must enter OTP, then call login again with `otp`. */
export interface LoginOtpRequiredData {
  otpRequired: true;
  /** May be present in non-production for testing; do not rely on it in UI. */
  otp?: string;
}

export type LoginResponseData = LoginSuccessData | LoginOtpRequiredData;

export interface LoginResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: LoginResponseData;
}

export function isLoginSuccessData(data: LoginResponseData | undefined): data is LoginSuccessData {
  return !!data && "access_token" in data && !!(data as LoginSuccessData).access_token;
}

export function isLoginOtpRequiredData(data: LoginResponseData | undefined): data is LoginOtpRequiredData {
  return !!data && "otpRequired" in data && (data as LoginOtpRequiredData).otpRequired === true;
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

/** Same payload as reset-password; calls `POST /auth/setUserPassword`. */
interface SetUserPasswordRequest {
  email: string;
  password: string;
  confirm_password: string;
  token: string;
}

interface SetUserPasswordResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data?: unknown;
}

/** Response for `GET /auth/checkSetPasswordStatus?token=<token>` */
export interface CheckSetPasswordStatusResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    /** "yes" if the user has already set their password, "no" otherwise */
    isUserSetPassword: "yes" | "no";
    /** Any additional status info returned by the API */
    [key: string]: unknown;
  };
}

export interface RefreshPermissionsResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    permissions: LoginPermissionModule[];
    branch_access: LoginBranchAccess[];
  };
}

export interface RefreshTokenResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    success: boolean;
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** First: `{ email, password }`. If `data.otpRequired`, second call: `{ email, password, otp }` (same URL). */
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
    setUserPassword: builder.mutation<
      SetUserPasswordResponse,
      SetUserPasswordRequest
    >({
      query: (payload) => ({
        url: "/auth/setUserPassword",
        method: "POST",
        body: payload,
      }),
    }),
    /** `GET /auth/checkSetPasswordStatus?token=<token>` — checks if the nurse/user has already set their password. */
    checkSetPasswordStatus: builder.query<CheckSetPasswordStatusResponse, string>({
      query: (token) => ({
        url: `/auth/checkSetPasswordStatus?token=${token}`,
        method: "GET",
      }),
    }),
    logout: builder.mutation<{ message: string; statusCode: number }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    refreshPermissions: builder.query<RefreshPermissionsResponse, number>({
      query: (userId) => ({
        url: `/auth/refreshpermissions?userId=${userId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSetUserPasswordMutation,
  useCheckSetPasswordStatusQuery,
  useLazyCheckSetPasswordStatusQuery,
  useLogoutMutation,
  useRefreshPermissionsQuery,
  useLazyRefreshPermissionsQuery,
} = authApi;

