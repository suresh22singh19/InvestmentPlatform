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
  }),
});

export const { useGetAllNotificationsQuery, useMarkNotificationAsReadMutation } =
  notificationApi;

