"use client";

/**
 * On every full browser load, calls GET /auth/refreshpermissions?userId=<id>
 * with the stored Bearer token so the Redux store always has up-to-date
 * permissions and branch_access — without re-posting the user's credentials.
 *
 * Skips on the login page and other public auth routes.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/store/hooks";
import { updatePermissions } from "@/store/slices/authSlice";
import { API_BASE_URL } from "@/lib/config/api";
import type { RefreshPermissionsResponse } from "@/store/api/authApi";

function isPublicAuthRoute(path: string): boolean {
  if (path === "/") return true;
  if (path.startsWith("/forgot-password")) return true;
  if (path.startsWith("/reset-password")) return true;
  return false;
}

async function fetchRefreshPermissions(
  token: string,
  userId: number
): Promise<RefreshPermissionsResponse | null> {
  const base = API_BASE_URL.replace(/\/$/, "");
  const url = `${base}/auth/refreshpermissions?userId=${userId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as RefreshPermissionsResponse;
}

function getStoredUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown };
    const id = Number(parsed?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function AuthSessionRefresh() {
  const dispatch = useAppDispatch();
  const ranForThisDocumentLoad = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (ranForThisDocumentLoad.current) return;
      if (typeof window === "undefined") return;

      const path = window.location.pathname || "";
      if (isPublicAuthRoute(path)) return;

      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      if (!token) return;

      const userId = getStoredUserId();
      if (!userId) return;

      ranForThisDocumentLoad.current = true;

      try {
        const body = await fetchRefreshPermissions(token, userId);
        if (body?.statusCode === 200 && Array.isArray(body?.data?.permissions)) {
          dispatch(
            updatePermissions({
              permissions: body.data.permissions,
              branch_access: body.data.branch_access ?? [],
            })
          );
        }
      } catch {
        ranForThisDocumentLoad.current = false;
      }
    };

    if (document.readyState === "complete") {
      void run();
    } else {
      const onLoad = () => void run();
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, [dispatch]);

  return null;
}
