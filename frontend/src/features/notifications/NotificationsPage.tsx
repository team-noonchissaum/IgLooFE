import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/services/notificationApi";
import { formatRelative } from "@/lib/format";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NotificationRes } from "@/lib/types";

function getNotificationLink(n: NotificationRes): string | null {
  if (n.refType == null || n.refId == null) return null;
  const type = String(n.refType).toUpperCase();
  if (type === "AUCTION") return `/auctions/${n.refId}`;
  return null;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useNotificationWebSocket();

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.list(),
  });

  const notifications = [...rawNotifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const readOne = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-main">알림</h1>
        {notifications.some((n) => !n.readAt) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => readAll.mutate()}
            loading={readAll.isPending}
          >
            전체 읽음
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border bg-white rounded-2xl border border-border overflow-hidden">
        {notifications.length === 0 ? (
          <li className="p-12 text-center text-text-muted">알림이 없습니다.</li>
        ) : (
          notifications.map((n) => {
            const link = getNotificationLink(n);
            const content = (
              <>
                <span className="material-symbols-outlined text-primary shrink-0">
                  notifications
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-main">{n.message}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      readOne.mutate(n.id);
                    }}
                    loading={readOne.isPending}
                  >
                    읽음
                  </Button>
                )}
              </>
            );
            return (
              <li
                key={n.id}
                className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${
                  !n.readAt ? "bg-primary-light/20" : ""
                } ${link ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (link) {
                    if (!n.readAt) readOne.mutate(n.id);
                    navigate(link);
                  }
                }}
                role={link ? "button" : undefined}
              >
                {content}
              </li>
            );
          })
        )}
      </ul>
      <p className="text-sm text-text-muted mt-4">
        알림 삭제/필터/페이징은 서버 미지원으로 전체 목록만 표시됩니다.
      </p>
    </main>
  );
}
