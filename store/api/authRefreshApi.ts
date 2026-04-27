import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RefreshTokenResponse } from "./authApi";

export type { RefreshTokenResponse };

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: "https://newhiims.dikonia.in/api/v2",
  // NOTE: credentials: "include" removed — the refresh_token cookie is
  // SameSite=Strict so the browser blocks it on cross-origin requests anyway,
  // and it was causing a CORS preflight failure.
  // Sending the current access_token as Bearer instead so the server can
  // identify the session. Backend should fix Set-Cookie to SameSite=None
  // when cookie-based refresh is needed.
  prepareHeaders: (headers) => {
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        : null;

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    return headers;
  },
});

export const authRefreshApi = createApi({
  reducerPath: "authRefreshApi",
  baseQuery: refreshBaseQuery,
  endpoints: (builder) => ({
    refreshToken: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: "/auth/refreshToken",
        method: "POST",
      }),
    }),
  }),
});

export const { useRefreshTokenMutation } = authRefreshApi;
