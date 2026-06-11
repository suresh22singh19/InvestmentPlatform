/**
 * Auth Slice
 * Purpose: Manages authentication state (user, token, auth status)
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import {
  formatPermissions,
  type NormalizedPermissionsMap,
  type RawModulePermission,
} from "@/utils/permission";

export interface User {
  id: number;
  branchId: number;
  branchName?: string;
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
  groupName: string | null;
  groups: unknown[];
  roleCategoryType?: string;
  roleId?: number;
  role?: { id: number; name: string };
  imgUrl?: string | null;
  aiVoiceActivated?: boolean | string;
}

/** Login API user shape: `groupName` / `groups` may be absent. Normalized in `setCredentials`. */
export type SetCredentialsUser = Omit<User, "groupName" | "groups"> & {
  groupName?: string | null;
  groups?: unknown[];
};

export interface LoginResponseData {
  user: User;
  permissions?: RawModulePermission[];
  branch_access?: BranchAccess[];
  login_type: string;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type SetCredentialsPayload = Omit<LoginResponseData, "user"> & {
  user: SetCredentialsUser;
};

export interface BranchAccess {
  id: number;
  name: string;
  type: string;
}

interface AuthState {
  loginData: LoginResponseData | null;
  permissions: NormalizedPermissionsMap;
  branchAccess: BranchAccess[];
  selectedBranch: BranchAccess | null;
  isAuthenticated: boolean;
  /** Unix ms timestamp of when the current access_token was issued (set on login or refresh). */
  tokenIssuedAt: number | null;
}

const initialState: AuthState = {
  loginData: null,
  permissions: {},
  branchAccess: [],
  selectedBranch: null,
  isAuthenticated: false,
  tokenIssuedAt: null,
};

/** Read last user-selected branch (survives refresh; cleared on logout). */
function readPersistedSelectedBranch(): BranchAccess | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedBranch");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BranchAccess;
    if (parsed && typeof parsed.id === "number" && typeof parsed.name === "string") {
      return {
        id: parsed.id,
        name: parsed.name,
        type: typeof parsed.type === "string" ? parsed.type : "",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * If the profile branch is missing from `branch_access` (common API mismatch), prepend it so
 * `resolveSelectedBranch` can match JWT/home `branchId` and dropdowns stay consistent.
 */
function ensureUserBranchInAccess(
  branchAccess: BranchAccess[],
  user: SetCredentialsUser,
  loginType?: string
): BranchAccess[] {
  const isDoctor = loginType?.toLowerCase() === "doctor" || user?.loginType?.toLowerCase() === "doctor";
  if (isDoctor) {
    return branchAccess;
  }
  const raw = user?.branchId as number | string | null | undefined;
  if (raw == null || raw === "") return branchAccess;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return branchAccess;
  if (branchAccess.some((b) => b.id === id)) return branchAccess;
  const name = (user.branchName ?? "").trim() || `Branch ${id}`;
  return [{ id, name, type: "" }, ...branchAccess];
}

/**
 * Prefer: (1) persisted selection if still in branch_access, (2) login user.branchId, (3) first branch.
 */
function resolveSelectedBranch(
  branchAccess: BranchAccess[],
  userBranchId: number | null | undefined,
  persisted: BranchAccess | null
): BranchAccess | null {
  if (!branchAccess.length) return null;
  if (persisted && branchAccess.some((b) => b.id === persisted.id)) {
    return branchAccess.find((b) => b.id === persisted.id) ?? null;
  }
  if (userBranchId != null && Number.isFinite(Number(userBranchId))) {
    const uid = Number(userBranchId);
    const fromUser = branchAccess.find((b) => b.id === uid);
    if (fromUser) return fromUser;
  }
  return branchAccess[0] ?? null;
}

function syncBranchToBrowserStorage(selectedBranch: BranchAccess, loginData: LoginResponseData | null) {
  if (typeof window === "undefined" || !loginData?.user) return;
  try {
    const user = {
      ...loginData.user,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
    };
    localStorage.setItem("user", JSON.stringify(user));
    const loginPayload = {
      ...loginData,
      user,
      branch_access: loginData.branch_access ?? [],
    };
    localStorage.setItem("loginData", JSON.stringify(loginPayload));
  } catch {
    /* ignore */
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Applies a successful login (or session refresh) payload: permissions, branch_access,
     * token, and mirrors to localStorage. Also used after full page load by AuthSessionRefresh
     * when the login API or optional GET session returns fresh data.
     */
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      const normalizedPermissions = formatPermissions(action.payload.permissions ?? []);
      const branchAccess = ensureUserBranchInAccess(
        action.payload.branch_access ?? [],
        action.payload.user,
        action.payload.login_type
      );
      const persisted = readPersistedSelectedBranch();
      const selectedBranch = resolveSelectedBranch(
        branchAccess,
        action.payload.user?.branchId,
        persisted
      );

      const user: User = {
        ...action.payload.user,
        branchId: selectedBranch?.id ?? action.payload.user?.branchId ?? 0,
        branchName: selectedBranch?.name ?? action.payload.user?.branchName,
        groupName: action.payload.user?.groupName ?? null,
        groups: action.payload.user?.groups ?? [],
      };

      const issuedAt = Date.now();

      state.loginData = {
        ...action.payload,
        user,
      };
      state.permissions = normalizedPermissions;
      state.branchAccess = branchAccess;
      state.selectedBranch = selectedBranch;
      state.isAuthenticated = true;
      state.tokenIssuedAt = issuedAt;

      // Also save to localStorage for backward compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", action.payload.access_token);
        localStorage.setItem("tokenIssuedAt", issuedAt.toString());
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("tokenType", action.payload.token_type);
        localStorage.setItem("loginType", action.payload.login_type);
        localStorage.setItem("expiresIn", action.payload.expires_in.toString());
        localStorage.setItem("permissions", JSON.stringify(normalizedPermissions));
        localStorage.setItem("branchAccess", JSON.stringify(branchAccess));
        if (selectedBranch) {
          localStorage.setItem("selectedBranch", JSON.stringify(selectedBranch));
        } else {
          localStorage.removeItem("selectedBranch");
        }
        localStorage.setItem(
          "loginData",
          JSON.stringify({
            ...action.payload,
            user,
            permissions: action.payload.permissions ?? [],
            branch_access: branchAccess,
          })
        );
      }
    },
    setSelectedBranch: (state, action: PayloadAction<number>) => {
      const selectedBranch = state.branchAccess.find((branch) => branch.id === action.payload);
      if (!selectedBranch) return;

      state.selectedBranch = selectedBranch;
      if (state.loginData?.user) {
        state.loginData.user.branchId = selectedBranch.id;
        state.loginData.user.branchName = selectedBranch.name;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("selectedBranch", JSON.stringify(selectedBranch));
        syncBranchToBrowserStorage(selectedBranch, state.loginData);
      }
    },
    updateUserProfile: (
      state,
      action: PayloadAction<{ userName: string; imgUrl?: string | null }>
    ) => {
      if (!state.loginData?.user) return;

      state.loginData.user.userName = action.payload.userName;
      state.loginData.user.name = action.payload.userName;
      if (action.payload.imgUrl !== undefined) {
        state.loginData.user.imgUrl = action.payload.imgUrl;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(state.loginData.user));
        try {
          const raw = localStorage.getItem("loginData");
          if (raw) {
            const loginData = JSON.parse(raw);
            loginData.user.userName = action.payload.userName;
            loginData.user.name = action.payload.userName;
            if (action.payload.imgUrl !== undefined) {
              loginData.user.imgUrl = action.payload.imgUrl;
            }
            localStorage.setItem("loginData", JSON.stringify(loginData));
          }
        } catch {
          /* ignore */
        }
      }
    },
    /**
     * Updates only permissions and branch_access from the refreshpermissions API.
     * Does NOT touch the token, user info, or isAuthenticated flag.
     */
    updatePermissions: (
      state,
      action: PayloadAction<{ permissions: RawModulePermission[]; branch_access: BranchAccess[] }>
    ) => {
      const normalizedPermissions = formatPermissions(action.payload.permissions ?? []);
      const branchAccess = state.loginData?.user
        ? ensureUserBranchInAccess(action.payload.branch_access ?? [], state.loginData.user, state.loginData.login_type)
        : (action.payload.branch_access ?? []);

      const persisted = readPersistedSelectedBranch();
      const selectedBranch = resolveSelectedBranch(
        branchAccess,
        state.loginData?.user?.branchId,
        persisted
      );

      state.permissions = normalizedPermissions;
      state.branchAccess = branchAccess;
      state.selectedBranch = selectedBranch;

      if (state.loginData) {
        state.loginData.permissions = action.payload.permissions;
        state.loginData.branch_access = branchAccess;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("permissions", JSON.stringify(normalizedPermissions));
        localStorage.setItem("branchAccess", JSON.stringify(branchAccess));
        if (selectedBranch) {
          localStorage.setItem("selectedBranch", JSON.stringify(selectedBranch));
        } else {
          localStorage.removeItem("selectedBranch");
        }
        try {
          const raw = localStorage.getItem("loginData");
          if (raw) {
            const stored = JSON.parse(raw);
            stored.permissions = action.payload.permissions ?? [];
            stored.branch_access = branchAccess;
            localStorage.setItem("loginData", JSON.stringify(stored));
          }
        } catch {
          /* ignore */
        }
      }
    },
    /**
     * Replaces only the access token + expiry after a successful `/auth/refreshToken` call.
     * All other auth state (user, permissions, branch, etc.) is left untouched.
     */
    updateToken: (
      state,
      action: PayloadAction<{ access_token: string; expires_in: number; token_type?: string }>
    ) => {
      if (!state.loginData) return;
      const issuedAt = Date.now();
      state.loginData.access_token = action.payload.access_token;
      state.loginData.expires_in = action.payload.expires_in;
      if (action.payload.token_type) {
        state.loginData.token_type = action.payload.token_type;
      }
      state.tokenIssuedAt = issuedAt;

      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", action.payload.access_token);
        localStorage.setItem("tokenIssuedAt", issuedAt.toString());
        localStorage.setItem("expiresIn", action.payload.expires_in.toString());
        if (action.payload.token_type) {
          localStorage.setItem("tokenType", action.payload.token_type);
        }
        try {
          const raw = localStorage.getItem("loginData");
          if (raw) {
            const stored = JSON.parse(raw);
            stored.access_token = action.payload.access_token;
            stored.expires_in = action.payload.expires_in;
            if (action.payload.token_type) stored.token_type = action.payload.token_type;
            localStorage.setItem("loginData", JSON.stringify(stored));
          }
        } catch {
          /* ignore */
        }
      }
    },
    logout: (state) => {
      state.loginData = null;
      state.permissions = {};
      state.branchAccess = [];
      state.selectedBranch = null;
      state.isAuthenticated = false;
      state.tokenIssuedAt = null;

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("tokenIssuedAt");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenType");
        localStorage.removeItem("loginType");
        localStorage.removeItem("expiresIn");
        localStorage.removeItem("loginData");
        localStorage.removeItem("permissions");
        localStorage.removeItem("branchAccess");
        localStorage.removeItem("selectedBranch");
        localStorage.removeItem("jatayuToken");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("user");
      }
    },
  },
});

export const { setCredentials, setSelectedBranch, updatePermissions, updateUserProfile, updateToken, logout } = authSlice.actions;

// Selectors
export const selectLoginData = (state: RootState) => state.auth.loginData;
export const selectPermissionsMap = (state: RootState) => state.auth.permissions ?? {};
export const selectBranchAccess = (state: RootState) => state.auth.branchAccess ?? [];
export const selectSelectedBranch = (state: RootState) => state.auth.selectedBranch ?? null;
export const selectUser = (state: RootState) => state.auth.loginData?.user ?? null;
export const selectToken = (state: RootState) => state.auth.loginData?.access_token ?? null;
export const selectTokenType = (state: RootState) => state.auth.loginData?.token_type ?? null;
export const selectLoginType = (state: RootState) => state.auth.loginData?.login_type ?? null;
export const selectExpiresIn = (state: RootState) => state.auth.loginData?.expires_in ?? null;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUserId = (state: RootState) => state.auth.loginData?.user?.id;
export const selectUserBranchId = (state: RootState) => state.auth.loginData?.user?.branchId;
export const selectUserEmail = (state: RootState) => state.auth.loginData?.user?.email;
export const selectUserName = (state: RootState) =>
  state.auth.loginData?.user?.name ?? state.auth.loginData?.user?.userName;
export const selectUserGroupName = (state: RootState) => state.auth.loginData?.user?.groupName;
export const selectUserBranchName = (state: RootState) => state.auth.loginData?.user?.branchName ?? null;
export const selectRoleCategoryType = (state: RootState) =>
  state.auth.loginData?.user?.roleCategoryType ?? null;
export const selectTokenIssuedAt = (state: RootState) => state.auth.tokenIssuedAt ?? null;

export default authSlice.reducer;

