import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PageResponse } from "@/lib/types";

interface ReportItem {
  reportId: number;
  status: string;
  reporterId: number;
  reporterNickname: string;
  targetType: string;
  targetId: number;
  targetName: string;
  reason: string;
  createdAt: string;
}

interface UserItem {
  userId: number;
  nickname: string;
  email?: string;
  status: string;
  role: string;
  reportCount: number;
  createdAt: string;
}

interface BlockedAuctionItem {
  auctionId: number;
  title: string;
  sellerId: number;
  sellerNickname: string;
  reason: string;
  blockedAt: string;
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "reports" | "users" | "blocked" | "stats"
  >("reports");
  const [reportPage, setReportPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [blockedPage, setBlockedPage] = useState(0);
  const [blockAuctionId, setBlockAuctionId] = useState("");
  const [blockAuctionReason, setBlockAuctionReason] = useState("");

  const { data: reportsPage, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin", "reports", reportPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<ReportItem> }>(
          "/api/admin/reports",
          {
            params: { page: reportPage, size: 10 },
          },
        )
        .then(unwrapData),
  });

  const { data: usersPage, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users", userPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<UserItem> }>(
          "/api/admin/users",
          {
            params: { page: userPage, size: 10 },
          },
        )
        .then(unwrapData),
  });

  const { data: blockedPageData, isLoading: blockedLoading } = useQuery({
    queryKey: ["admin", "auctions", "blocked", blockedPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<BlockedAuctionItem> }>(
          "/api/admin/auctions/blocked",
          {
            params: { page: blockedPage, size: 10 },
          },
        )
        .then(unwrapData),
  });

  const { data: statistics } = useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: () =>
      api
        .get<{ message: string; data: Record<string, unknown> }>(
          "/api/admin/statistics",
        )
        .then(unwrapData),
  });

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      api.patch(`/api/admin/users/${userId}/block`, { reason }),
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
  const blockedAuctions = blockedPageData?.content ?? [];

  const blockAuction = useMutation({
    mutationFn: ({ auctionId, reason }: { auctionId: number; reason: string }) =>
      api.post(`/api/admin/auctions/${auctionId}/block`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions", "blocked"] });
      setBlockAuctionId("");
      setBlockAuctionReason("");
    },
  });

  const restoreAuction = useMutation({
    mutationFn: (auctionId: number) =>
      api.patch(`/api/admin/auctions/${auctionId}/restore`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions", "blocked"] }),
  });

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
            onClick={() => setActiveTab("blocked")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "blocked"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">block</span>
            차단 경매
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
            통계
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
                      key={r.reportId}
                      className="p-4 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-medium">
                          신고 #{r.reportId} - {r.status}
                        </p>
                        <p className="text-sm text-text-muted">
                          {r.reason}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          대상: {r.targetType} #{r.targetId} ({r.targetName})
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          processReport.mutate({
                            reportId: r.reportId,
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
                      key={u.userId}
                      className="p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{u.nickname}</p>
                        <p className="text-sm text-text-muted">
                          {u.email ?? `#${u.userId}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          상태: {u.status} · 신고 {u.reportCount}건
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt("차단 사유를 입력하세요.");
                            if (!reason) return;
                            blockUser.mutate({ userId: u.userId, reason });
                          }}
                          loading={blockUser.isPending}
                        >
                          차단
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unblockUser.mutate(u.userId)}
                          loading={unblockUser.isPending}
                        >
                          차단 해제
                        </Button>
                      </div>
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
        {activeTab === "blocked" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              차단 경매 관리
            </h1>
            <div className="bg-white rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <input
                  value={blockAuctionId}
                  onChange={(e) => setBlockAuctionId(e.target.value)}
                  placeholder="경매 ID"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  value={blockAuctionReason}
                  onChange={(e) => setBlockAuctionReason(e.target.value)}
                  placeholder="차단 사유"
                  className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const auctionId = Number(blockAuctionId);
                    if (!auctionId || !blockAuctionReason.trim()) return;
                    blockAuction.mutate({
                      auctionId,
                      reason: blockAuctionReason.trim(),
                    });
                  }}
                  loading={blockAuction.isPending}
                >
                  차단
                </Button>
              </div>
            </div>
            {blockedLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {blockedAuctions.map((a) => (
                    <li
                      key={a.auctionId}
                      className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium">
                          #{a.auctionId} {a.title}
                        </p>
                        <p className="text-sm text-text-muted">
                          판매자: {a.sellerNickname} (#{a.sellerId})
                        </p>
                        <p className="text-xs text-text-muted">
                          사유: {a.reason}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => restoreAuction.mutate(a.auctionId)}
                        loading={restoreAuction.isPending}
                      >
                        복구
                      </Button>
                    </li>
                  ))}
                </ul>
                {blockedPageData && !blockedPageData.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setBlockedPage((p) => p + 1)}
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
              통계
            </h1>
            <div className="bg-primary-light/30 border border-primary/20 rounded-xl p-8 text-center">
              <p className="text-text-muted">
                일일 통계 응답을 그대로 표시합니다.
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
