/**
 * RTK Query Base API
 * Purpose: Base configuration for all RTK Query endpoints
 * - Adds auth token to every request
 * - Handles 401 globally (auto-logout + redirect to login). 403 is not treated as
 *   session expiry — APIs often use 403 for “authenticated but not allowed”, which
 *   must not clear a valid JWT.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "@/lib/config/api";
import { getVisitClientIp } from "@/lib/api/clientVisitIp";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import type { RootState } from "../index";
import { logout } from "../slices/authSlice";
import { logoutJatayu } from "./jatayuApi";

/**
 * Paths for unauthenticated auth APIs. 401 on these must NOT run global logout + `window.location = /`
 * (e.g. wrong password or wrong OTP would reset the app and drop the OTP step).
 */
const PUBLIC_AUTH_PATH_SUFFIXES = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/setUserPassword",
  "/auth/checkSetPasswordStatus",
] as const;

function normalizeRequestPathFromArgs(args: unknown): string {
  const raw =
    typeof args === "string"
      ? args
      : args && typeof args === "object" && "url" in args && typeof (args as { url: unknown }).url === "string"
        ? (args as { url: string }).url
        : "";
  let path = (raw.split("?")[0] || "").trim();
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* keep */
    }
  }
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  return path.replace(/\/+$/, "") || "/";
}

function isPublicAuthEndpoint(args: unknown): boolean {
  const path = normalizeRequestPathFromArgs(args);
  if (!path) return false;
  return PUBLIC_AUTH_PATH_SUFFIXES.some((suffix) => path === suffix || path.endsWith(suffix));
}

/** Names of `injectEndpoints` mutations that run before a session exists — never hard-redirect on 401. */
const UNAUTHED_AUTH_MUTATION_ENDPOINTS = new Set([
  "login",
  "forgotPassword",
  "resetPassword",
  "setUserPassword",
]);

function isUnauthenticatedAuthMutation(api: Pick<BaseQueryApi, "endpoint" | "type">): boolean {
  return api.type === "mutation" && UNAUTHED_AUTH_MUTATION_ENDPOINTS.has(api.endpoint);
}

/** Extract API error message for 401 heuristics (some servers misuse 401 for “no permission”). */
function getApiErrorMessage(result: unknown): string {
  const err = result as {
    error?: { data?: { message?: unknown; error?: unknown } };
  };
  const m = err?.error?.data?.message;
  const e = err?.error?.data?.error;
  const raw = Array.isArray(m) ? m[0] : m ?? e;
  return typeof raw === "string" ? raw : "";
}

/**
 * If true, do not clear the session: response looks like “wrong role / resource” not “bad JWT”.
 * Backends should use 403 for this; when they use 401, global logout was kicking users with valid tokens.
 */
function shouldSkipGlobalLogoutForLikelyPermission401(message: string): boolean {
  const m = message.toLowerCase().trim();
  if (!m) return false;
  if (
    m.includes("token") ||
    m.includes("jwt") ||
    m.includes("expired") ||
    m.includes("invalid credential") ||
    m.includes("invalid credentials")
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

// Raw base query that attaches auth headers
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux state or localStorage
    const state = getState() as RootState;
    const token =
      state.auth?.loginData?.access_token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        : null);

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    if (!headers.get("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  },
});

/** Attach x-forwarded-for on every RTK Query request (same behaviour as axios). */
const baseQueryWithClientIp: typeof rawBaseQuery = async (args, api, extraOptions) => {
  let nextArgs = args;
  if (typeof window !== "undefined") {
    const visitIp = await getVisitClientIp();
    if (visitIp) {
      if (typeof args === "string") {
        nextArgs = { url: args, headers: { "x-forwarded-for": visitIp } };
      } else {
        const headers = new Headers(args.headers as HeadersInit | undefined);
        headers.set("x-forwarded-for", visitIp);
        nextArgs = { ...args, headers };
      }
    }
  }
  return rawBaseQuery(nextArgs, api, extraOptions);
};

// Wrap base query to handle 401 (expired or invalid token) globally
const baseQueryWithAuthHandling: typeof rawBaseQuery = async (args, api, extraOptions) => {
  const result = await baseQueryWithClientIp(args, api, extraOptions);

  const status = (result as any)?.error?.status as number | undefined;
  const bodyStatus = (result as any)?.error?.data?.statusCode as number | undefined;

  const isUnauthorized = status === 401 || bodyStatus === 401;
  const errMsg = getApiErrorMessage(result);
  const skipForLikelyPermissionDenied =
    isUnauthorized && shouldSkipGlobalLogoutForLikelyPermission401(errMsg);

  const skipGlobalLogoutRedirect =
    isPublicAuthEndpoint(args) ||
    isUnauthenticatedAuthMutation(api) ||
    skipForLikelyPermissionDenied;

  if (
    isUnauthorized &&
    !skipGlobalLogoutRedirect &&
    process.env.NODE_ENV === "development"
  ) {
    console.warn("[baseApi] 401 → logout", {
      path: normalizeRequestPathFromArgs(args),
      status,
      bodyStatus,
      message: errMsg || "(empty)",
    });
  }

  if (isUnauthorized && !skipGlobalLogoutRedirect) {
    // Clear auth state
    api.dispatch(logout());

    // Clear Jatayu token and logout
    logoutJatayu().catch((err) => {
      console.error("Jatayu auto-logout failed:", err);
    });

    // Also redirect to login/root so user can re-authenticate
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuthHandling,
  tagTypes: [
    "Auth",
    "MasterServices",
    "Settings",
    "Gate",
    "Notifications",
    "AppBellNotifications",
    "Prebookings",
    "Branches",
    "BranchHardwareFacility",
    "BranchRoomType",
    "BranchRooms",
    "BranchBeds",
    "RoleAndPermissions",
    "BranchRoleMaster",
    "ApprovalLevelSetup",
    "ApprovalLeaveAssignment",
    "AssignApprovalLevel",
    "LevelForAssign",
    "BranchServices",
    "PatientTokenDisplay",
    "Doctors",
    "Nurses",
    "Document",
    "IpdReception",
    "PatientFiles",
  ],
  endpoints: () => ({}),
});

