"use client";

/**
 * Proactively refreshes the auth token 30 seconds before it expires.
 *
 * Flow:
 *  1. On mount (and whenever the token changes), compute how many ms remain
 *     until `tokenIssuedAt + (expires_in - 30) * 1000`.
 *  2. Set a timeout for that duration.
 *  3. On fire, call useRefreshTokenMutation → POST /auth/refreshToken
 *     (credentials: "include" is set on the dedicated refreshBaseQuery).
 *  4. Dispatch `updateToken` → new token lands in Redux + localStorage.
 *  5. The state change triggers the effect again → schedules the next refresh.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectIsAuthenticated,
  selectToken,
  selectExpiresIn,
  selectTokenIssuedAt,
  updateToken,
  // logout,  // 🚧 re-enable after debugging refresh token error
} from "@/store/slices/authSlice";
import { useRefreshTokenMutation } from "@/store/api/authRefreshApi";

/** Minimum delay between refresh attempts to avoid tight loops on bad responses. */
const MIN_RETRY_DELAY_MS = 5_000;

export function TokenRefreshProvider() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectToken);
  const expiresIn = useAppSelector(selectExpiresIn); // seconds
  const tokenIssuedAt = useAppSelector(selectTokenIssuedAt); // ms timestamp

  const [triggerRefreshToken] = useRefreshTokenMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isAuthenticated || !token || !expiresIn) return;

    // Determine when the token was issued — prefer store value, fall back to localStorage.
    let issuedAt = tokenIssuedAt;
    if (!issuedAt && typeof window !== "undefined") {
      const raw = localStorage.getItem("tokenIssuedAt");
      issuedAt = raw ? Number(raw) : Date.now();
    }
    if (!issuedAt) issuedAt = Date.now();

    // Schedule the refresh when 90% of the token's lifetime is completed.
    const refreshAtMs = issuedAt + (expiresIn * 0.9) * 1_000;
    const delay = Math.max(refreshAtMs - Date.now(), MIN_RETRY_DELAY_MS);

    console.info(
      `[TokenRefresh] next refresh in ${Math.round(delay / 1000)}s` +
      ` (expires_in=${expiresIn}s, 90% lifetime threshold applied)`
    );

    timerRef.current = setTimeout(async () => {
      console.info("[TokenRefresh] firing POST /auth/refreshToken ...");

      const result = await triggerRefreshToken();

      // Log full API response for debugging
      console.log("[TokenRefresh] raw response →", result);

      if ("data" in result && result.data?.statusCode === 200 && result.data?.data?.access_token) {
        const { access_token, expires_in: newExpiresIn, token_type } = result.data.data;

        console.log("[TokenRefresh] ✅ success →", {
          access_token,
          expires_in: newExpiresIn,
          token_type,
          message: result.data.message,
          statusCode: result.data.statusCode,
          timestamp: result.data.timestamp,
        });

        dispatch(updateToken({ access_token, expires_in: newExpiresIn, token_type }));
      } else {
        // 🚧 DEBUG MODE — logout disabled temporarily to inspect the error
        console.error("[TokenRefresh] ❌ refresh failed — full result →", result);
        console.error("[TokenRefresh] ❌ error detail →", "error" in result ? result.error : "no error field");
        // TODO: re-enable logout after debugging
        // dispatch(logout());
        // if (typeof window !== "undefined") { window.location.href = "/"; }

        // 🚧 DEBUG MODE — logout disabled temporarily to inspect the error
        console.error("[TokenRefresh] ❌ refresh failed — full result →", result);
        console.error("[TokenRefresh] ❌ error detail →", "error" in result ? result.error : "no error field");
        // TODO: re-enable logout after debugging
        // dispatch(logout());
        // if (typeof window !== "undefined") { window.location.href = "/"; }
      }
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, token, expiresIn, tokenIssuedAt, dispatch, triggerRefreshToken]);

  return null;
}
