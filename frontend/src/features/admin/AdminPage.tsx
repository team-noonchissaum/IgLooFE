import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PageResponse } from "@/lib/types";

interface ReportItem {
  id: number;
  status?: string;
  reporterId?: number;
  reportedUserId?: number;
  reason?: string;
  createdAt?: string;
}

interface UserItem {
  id: number;
  nickname: string;
  email?: string;
  blocked?: boolean;
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"reports" | "users" | "stats">(
    "reports",
  );
  const [reportPage, setReportPage] = useState(0);
  const [userPage, setUserPage] = useState(0);

  const { data: reportsPage, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin", "reports", reportPage],
    queryFn: () =>
      api
        .get<PageResponse<ReportItem>>("/api/admin/reports", {
          params: { page: reportPage, size: 10 },
        })
        .then((r) => r.data),
  });

  const { data: usersPage, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users", userPage],
    queryFn: () =>
      api
        .get<PageResponse<UserItem>>("/api/admin/users", {
          params: { page: userPage, size: 10 },
        })
        .then((r) => r.data),
  });

  const { data: statistics } = useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: () => api.get("/api/admin/statistics").then((r) => r.data),
  });

  const blockUser = useMutation({
    mutationFn: (userId: number) =>
      api.patch(`/api/admin/users/${userId}/block`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const unblockUser = useMutation({
    mutationFn: (userId: number) =>
      api.patch(`/api/admin/users/${userId}/unblock`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const processReport = useMutation({
    mutationFn: ({ reportId, body }: { reportId: number; body: unknown }) =>
      api.patch(`/api/admin/reports/${reportId}`, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });

  const reports = reportsPage?.content ?? [];
  const users = usersPage?.content ?? [];

  return (
    <main className="flex min-h-[80vh]">
      <aside className="w-64 shrink-0 border-r border-border bg-gray-50 p-6 hidden md:block">
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">gavel</span>
          Igloo Admin
        </h2>
        <nav className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "reports"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">verified_user</span>
            신고 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "users"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            유저 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "stats"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            통계 (Placeholder)
          </button>
        </nav>
      </aside>
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === "reports" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              신고 목록
            </h1>
            {reportsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {reports.map((r) => (
                    <li
                      key={r.id}
                      className="p-4 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-medium">
                          신고 #{r.id} - {r.status ?? "-"}
                        </p>
                        <p className="text-sm text-text-muted">
                          {r.reason ?? "사유 없음"}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          processReport.mutate({
                            reportId: r.id,
                            body: { status: "PROCESSED" },
                          })
                        }
                        loading={processReport.isPending}
                      >
                        처리
                      </Button>
                    </li>
                  ))}
                </ul>
                {reportsPage && !reportsPage.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setReportPage((p) => p + 1)}
                      className="text-primary font-semibold hover:underline"
                    >
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "users" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              유저 목록
            </h1>
            {usersLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {users.map((u) => (
                    <li
                      key={u.id}
                      className="p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{u.nickname}</p>
                        <p className="text-sm text-text-muted">
                          {u.email ?? `#${u.id}`}
                        </p>
                      </div>
                      {u.blocked ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unblockUser.mutate(u.id)}
                          loading={unblockUser.isPending}
                        >
                          차단 해제
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => blockUser.mutate(u.id)}
                          loading={blockUser.isPending}
                        >
                          차단
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {usersPage && !usersPage.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setUserPage((p) => p + 1)}
                      className="text-primary font-semibold hover:underline"
                    >
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "stats" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              통계 (Placeholder)
            </h1>
            <div className="bg-primary-light/30 border border-primary/20 rounded-xl p-8 text-center">
              <p className="text-text-muted">
                일일 통계 API는 현재 placeholder 성격으로 0 기반 더미 응답을
                반환합니다.
              </p>
              <pre className="mt-4 text-left text-sm bg-white p-4 rounded-lg border border-border overflow-auto">
                {JSON.stringify(statistics ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
