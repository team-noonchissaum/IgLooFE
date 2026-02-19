import { api, unwrapData } from "@/lib/api";
import type { NotificationRes } from "@/lib/types";

/** 알림 - GET /api/notifications, unread-count, PATCH read/read-all */
export const notificationApi = {
  list: () =>
    api
      .get<{ message: string; data: NotificationRes[] }>("/api/notifications")
      .then(unwrapData),

  getUnreadCount: () =>
    api
      .get<{ message: string; data: number }>("/api/notifications/unread-count")
      .then(unwrapData),

  markRead: (notificationId: number) =>
    api
      .patch<{ message: string; data: NotificationRes }>(
        `/api/notifications/${notificationId}/read`,
      )
      .then(unwrapData),

  markAllRead: () =>
    api
      .patch<{ message: string; data: number }>("/api/notifications/read-all")
      .then(unwrapData),
};
