import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatKrw } from "@/lib/format";
import type { PageResponse, AuctionRes, WithdrawalRes } from "@/lib/types";

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

interface BlockedUserItem {
  userId: number;
  email: string;
  nickname: string;
  blockedAt: string;
  blockReason: string;
}

interface StatisticsData {
  date: string;
  transaction: {
    totalCount: number;
    completedCount: number;
    canceledCount: number;
  };
  auction: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    successRate: number;
  };
  credit: {
    totalCharged: number;
    totalUsed: number;
    totalWithdrawn: number;
  };
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    | "reports"
    | "users"
    | "auctions"
    | "blockedAuctions"
    | "blockedUsers"
    | "withdrawals"
    | "stats"
  >("reports");
  const [reportPage, setReportPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [auctionPage, setAuctionPage] = useState(0);
  const [blockedPage, setBlockedPage] = useState(0);
  const [blockedUsersPage, setBlockedUsersPage] = useState(0);
  const [withdrawalPage, setWithdrawalPage] = useState(0);
  const [statsDate, setStatsDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [blockAuctionReasonMap, setBlockAuctionReasonMap] = useState<Map<number, string>>(new Map());

  const { data: reportsPage, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin", "reports", reportPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<ReportItem> }>(
          "/api/admin/reports",
          {
            params: {
              page: reportPage,
              size: 10,
              targetType: "AUCTION",
              status: "PENDING",
            },
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

  const { data: auctionsPage, isLoading: auctionsLoading } = useQuery({
    queryKey: ["admin", "auctions", auctionPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<AuctionRes> }>(
          "/api/auctions",
          {
            params: { page: auctionPage, size: 10 },
          },
        )
        .then(unwrapData),
    enabled: activeTab === "auctions",
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
    enabled: activeTab === "blockedAuctions",
  });

  const { data: blockedUsersPageData, isLoading: blockedUsersLoading } =
    useQuery({
      queryKey: ["admin", "users", "blocked", blockedUsersPage],
      queryFn: () =>
        api
          .get<{ message: string; data: PageResponse<BlockedUserItem> }>(
            "/api/admin/users/blocked",
            {
              params: { page: blockedUsersPage, size: 10 },
            }
          )
          .then(unwrapData),
      enabled: activeTab === "blockedUsers",
    });

  const { data: statistics } = useQuery({
    queryKey: ["admin", "statistics", statsDate],
    queryFn: () =>
      api
        .get<{ message: string; data: StatisticsData }>(
          "/api/admin/statistics",
          { params: { date: statsDate } }
        )
        .then(unwrapData),
    enabled: activeTab === "stats",
  });

  const { data: withdrawalsPage, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["admin", "withdrawals", withdrawalPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<WithdrawalRes> }>(
          "/api/withdrawals/requested",
          { params: { page: withdrawalPage, size: 10 } }
        )
        .then(unwrapData),
    enabled: activeTab === "withdrawals",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "blocked"] });
    },
  });

  const processReport = useMutation({
    mutationFn: ({ reportId, body }: { reportId: number; body: unknown }) =>
      api.patch(`/api/admin/reports/${reportId}`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      const body = variables.body as { blockTarget?: boolean };
      if (body?.blockTarget) {
        queryClient.invalidateQueries({ queryKey: ["admin", "auctions", "blocked"] });
      }
    },
  });

  const reports = reportsPage?.content ?? [];
  const users = usersPage?.content ?? [];
  // 종료되거나 차단된 경매 제외
  const excludedStatuses = ["ENDED", "SUCCESS", "FAILED", "CANCELED", "BLOCKED"];
  const auctions = (auctionsPage?.content ?? []).filter(
    (a) => !excludedStatuses.includes(a.status)
  );
  const blockedAuctions = blockedPageData?.content ?? [];
  const blockedUsers = blockedUsersPageData?.content ?? [];
  const withdrawals = withdrawalsPage?.content ?? [];

  const blockAuction = useMutation({
    mutationFn: ({ auctionId, reason }: { auctionId: number; reason: string }) =>
      api.post(`/api/admin/auctions/${auctionId}/block`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions", "blocked"] });
      setBlockAuctionReasonMap((prev) => {
        const next = new Map(prev);
        next.delete(variables.auctionId);
        return next;
      });
    },
  });

  const restoreAuction = useMutation({
    mutationFn: (auctionId: number) =>
      api.patch(`/api/admin/auctions/${auctionId}/restore`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions", "blocked"] }),
  });

  const confirmWithdrawal = useMutation({
    mutationFn: (withdrawalId: number) =>
      api.post(`/api/withdrawals/${withdrawalId}/confirm`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
  });

  const rejectWithdrawal = useMutation({
    mutationFn: (withdrawalId: number) =>
      api.post(`/api/withdrawals/${withdrawalId}/reject`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
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
            onClick={() => setActiveTab("auctions")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "auctions"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">gavel</span>
            경매 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blockedAuctions")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "blockedAuctions"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">block</span>
            차단된 경매
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blockedUsers")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "blockedUsers"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">person_off</span>
            차단된 유저
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdrawals")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "withdrawals"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">payments</span>
            출금 승인/반려
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
                      {r.status === "PENDING" ? (
                        r.targetType === "AUCTION" ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              processReport.mutate({
                                reportId: r.reportId,
                                body: {
                                  status: "PROCESSED",
                                  blockTarget: true,
                                  processResult:
                                    r.reason?.trim() || "신고에 따른 경매 차단",
                                },
                              })
                            }
                            loading={processReport.isPending}
                          >
                            차단
                          </Button>
                        ) : (
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
                        )
                      ) : (
                        <span className="text-sm text-text-muted">
                          {r.status}
                        </span>
                      )}
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
        {activeTab === "auctions" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              경매 관리
            </h1>
            {auctionsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {auctions.map((a) => {
                    const reason = blockAuctionReasonMap.get(a.auctionId) || "";
                    return (
                      <li
                        key={a.auctionId}
                        className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {a.imageUrls && a.imageUrls.length > 0 && (
                              <img
                                src={a.imageUrls[0]}
                                alt={a.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">
                                #{a.auctionId} {a.title}
                              </p>
                              <p className="text-sm text-text-muted">
                                판매자: {a.sellerNickname}
                              </p>
                              <p className="text-xs text-text-muted">
                                상태: {a.status} · 현재가: {a.currentPrice.toLocaleString()}원
                              </p>
                            </div>
                          </div>
                          {a.status !== "BLOCKED" && (
                            <div className="mt-3 flex gap-2">
                              <input
                                type="text"
                                value={reason}
                                onChange={(e) =>
                                  setBlockAuctionReasonMap((prev) => {
                                    const next = new Map(prev);
                                    next.set(a.auctionId, e.target.value);
                                    return next;
                                  })
                                }
                                placeholder="차단 사유"
                                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  if (!reason.trim()) {
                                    alert("차단 사유를 입력하세요.");
                                    return;
                                  }
                                  blockAuction.mutate({
                                    auctionId: a.auctionId,
                                    reason: reason.trim(),
                                  });
                                }}
                                loading={blockAuction.isPending}
                                disabled={!reason.trim()}
                              >
                                차단
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {auctions.length === 0 && (
                  <p className="p-8 text-center text-text-muted">
                    경매가 없습니다.
                  </p>
                )}
                {auctionsPage && !auctionsPage.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setAuctionPage((p) => p + 1)}
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
        {activeTab === "blockedAuctions" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              차단된 경매
            </h1>
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
                          사유: {a.reason} · 차단일: {new Date(a.blockedAt).toLocaleString()}
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
                {blockedAuctions.length === 0 && (
                  <p className="p-8 text-center text-text-muted">
                    차단된 경매가 없습니다.
                  </p>
                )}
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
        {activeTab === "blockedUsers" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              차단된 유저 목록
            </h1>
            {blockedUsersLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {blockedUsers.map((u) => (
                    <li
                      key={u.userId}
                      className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium">
                          {u.nickname} (#{u.userId})
                        </p>
                        <p className="text-sm text-text-muted">{u.email}</p>
                        <p className="text-xs text-text-muted mt-1">
                          차단 일시: {u.blockedAt} · 사유: {u.blockReason}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => unblockUser.mutate(u.userId)}
                        loading={unblockUser.isPending}
                      >
                        차단 해제
                      </Button>
                    </li>
                  ))}
                </ul>
                {blockedUsers.length === 0 && (
                  <p className="p-8 text-center text-text-muted">
                    차단된 유저가 없습니다.
                  </p>
                )}
                {blockedUsersPageData && !blockedUsersPageData.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() =>
                        setBlockedUsersPage((p) => p + 1)
                      }
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
        {activeTab === "withdrawals" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              출금 승인/반려
            </h1>
            {withdrawalsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {withdrawals.map((w) => {
                    const total = w.amount + w.feeAmount;
                    return (
                      <li
                        key={w.withdrawalId}
                        className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium">
                            출금 #{w.withdrawalId} · {formatKrw(w.amount)}
                          </p>
                          <p className="text-sm text-text-muted">
                            수수료 {formatKrw(w.feeAmount)} · 합계{" "}
                            {formatKrw(total)}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            신청일 {formatDateTime(w.createdAt)} · 상태 {w.status}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              confirmWithdrawal.mutate(w.withdrawalId)
                            }
                            loading={
                              confirmWithdrawal.isPending &&
                              confirmWithdrawal.variables === w.withdrawalId
                            }
                          >
                            승인
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              rejectWithdrawal.mutate(w.withdrawalId)
                            }
                            loading={
                              rejectWithdrawal.isPending &&
                              rejectWithdrawal.variables === w.withdrawalId
                            }
                          >
                            반려
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {withdrawals.length === 0 && (
                  <p className="p-8 text-center text-text-muted">
                    승인 대기 출금이 없습니다.
                  </p>
                )}
                {withdrawalsPage && !withdrawalsPage.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setWithdrawalPage((p) => p + 1)}
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
              일일 통계
            </h1>
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-2">
                조회 날짜
              </label>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => setStatsDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            {statistics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3">
                      거래
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">전체</dt>
                        <dd className="font-bold">
                          {statistics.transaction.totalCount}건
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">완료</dt>
                        <dd className="font-bold text-green-600">
                          {statistics.transaction.completedCount}건
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">취소</dt>
                        <dd className="font-bold text-amber-600">
                          {statistics.transaction.canceledCount}건
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3">
                      경매
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">전체</dt>
                        <dd className="font-bold">
                          {statistics.auction.totalCount}건
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">낙찰</dt>
                        <dd className="font-bold text-green-600">
                          {statistics.auction.successCount}건
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">유찰</dt>
                        <dd className="font-bold text-red-600">
                          {statistics.auction.failedCount}건
                        </dd>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <dt className="text-text-muted">낙찰률</dt>
                        <dd className="font-bold text-primary">
                          {statistics.auction.successRate}%
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3">
                      크레딧 (원)
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">충전</dt>
                        <dd className="font-bold text-green-600">
                          {statistics.credit.totalCharged.toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">사용</dt>
                        <dd className="font-bold">
                          {statistics.credit.totalUsed.toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">출금</dt>
                        <dd className="font-bold">
                          {statistics.credit.totalWithdrawn.toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <p className="text-sm text-text-muted">
                  기준일: {statistics.date}
                </p>
              </div>
            )}
            {activeTab === "stats" && !statistics && (
              <p className="text-text-muted py-8">통계를 불러오는 중...</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
