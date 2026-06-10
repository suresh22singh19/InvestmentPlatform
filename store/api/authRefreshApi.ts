import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RefreshTokenResponse } from "./authApi";

export type { RefreshTokenResponse };

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: "https://hiims.dikonia.in/api/v2",
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    // Get the refresh_token from browser cookies
    if (typeof document !== "undefined") {
      const match = document.cookie.match(new RegExp('(^| )refresh_token=([^;]*)'));
      const refreshToken = match ? decodeURIComponent(match[2]) : null;
      if (refreshToken) {
        headers.set("Authorization", `Bearer ${refreshToken}`);
      }
    }

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
