/**
 * Notification API
 * Purpose: Handles notification-related API endpoints
 */

import { baseApi } from "./baseApi";

export interface Notification {
  notification_id: number;
  message: string;
  is_read: boolean;
  created_date: string;
}

export interface GetAllNotificationsParams {
  role_name: string;
  user_id: number;
  limit?: number;
  page?: number;
}

export interface GetAllNotificationsResponse {
  success: boolean;
  data: {
    rows: Notification[];
    count: number;
    unreadCount: number;
  };
  message?: string;
}

/** Matches GET /dashboard/getDashboardNotifications `data.notifications[]` items */
export interface BellNotificationMetadata {
  requestId: number;
  branchId?: number;
  newContactNo?: string;
  oldContactNo?: string;
}

/** Bell / in-app list from GET /dashboard/getDashboardNotifications (not tied to the dashboard page module) */
export interface BellNotificationItem {
  id: number;
  branchId?: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: BellNotificationMetadata;
  sentBy?: number;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetBellNotificationsResponse {
  success: boolean;
  data: {
    total: number;
    unreadCount: number;
    readCount: number;
    notifications: BellNotificationItem[];
  };
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all notifications for a user
     */
    getAllNotifications: builder.query<GetAllNotificationsResponse, GetAllNotificationsParams>({
      query: (params) => {
        const { role_name, user_id, limit = 15, page = 1 } = params;
        const queryParams = new URLSearchParams({
          role_name,
          user_id: user_id.toString(),
          limit: limit.toString(),
          page: page.toString(),
        });
        return {
          url: `/admin/notifications?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Notifications"],
    }),
    /**
     * Mark notification as read
     */
    markNotificationAsRead: builder.mutation<
      { success: boolean; message?: string },
      { notification_id: number }
    >({
      query: (payload) => ({
        url: "/admin/notifications/mark-as-read",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Notifications"],
    }),
    /**
     * Global bell notifications for the logged-in user (runs on app load; not dashboard-page specific).
     * GET /dashboard/getDashboardNotifications?userId=
     */
    getBellNotifications: builder.query<GetBellNotificationsResponse, { userId: number }>({
      query: ({ userId }) => ({
        url: "/dashboard/getDashboardNotifications",
        method: "GET",
        params: { userId },
      }),
      providesTags: ["AppBellNotifications"],
    }),
    markBellNotificationAsRead: builder.mutation<
      { success: boolean; message?: string; statusCode?: number; data: null; timestamp?: string },
      { notificationId: number }
    >({
      query: ({ notificationId }) => ({
        url: `/dashboard/markNotificationsAsRead?notificationId=${notificationId}`,
        method: "PATCH",
      }),
      invalidatesTags: ["AppBellNotifications"],
    }),
  }),
});

export const {
  useGetAllNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useGetBellNotificationsQuery,
  useMarkBellNotificationAsReadMutation,
} = notificationApi;

