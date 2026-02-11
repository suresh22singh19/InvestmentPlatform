/**
 * RTK Query Base API
 * Purpose: Base configuration for all RTK Query endpoints
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "@/lib/config/api";
import type { RootState } from "../index";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
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
  }),
  tagTypes: ["Auth", "Settings", "Gate", "Notifications"],
  endpoints: () => ({}),
});

