import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime, formatKrw } from "@/lib/format";
import { useToastStore } from "@/stores/toastStore";
import { categoryApi } from "@/services/categoryApi";
import { couponApi, type Coupon, type CouponIssueReq } from "@/services/couponApi";
import type { PageResponse, AuctionRes, WithdrawalRes, Category } from "@/lib/types";

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

interface InquiryItem {
  inquiryId: number;
  email: string;
  nickname: string;
  content: string;
  createdAt: string;
}

interface CategoryTreeNodeType extends Category {
  children: CategoryTreeNodeType[];
}

function CategoryTreeNode({
  node,
  depth,
  onDelete,
}: {
  node: CategoryTreeNodeType;
  depth: number;
  onDelete: (cat: Category) => void;
}) {
  const paddingLeft = depth * 24;
  const canDelete = node.name !== "기타";

  return (
    <>
      <li
        className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50"
        style={{ paddingLeft: paddingLeft + 12 }}
      >
        <span className="font-medium">{node.name}</span>
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(node)}
          >
            삭제
          </Button>
        )}
      </li>
      {node.children.map((child) => (
        <CategoryTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onDelete={onDelete}
        />
      ))}
    </>
  );
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
  const addToast = useToastStore((s) => s.add);
  const [activeTab, setActiveTab] = useState<
    | "reports"
    | "users"
    | "auctions"
    | "blockedAuctions"
    | "blockedUsers"
    | "inquiries"
    | "withdrawals"
    | "categories"
    | "coupons"
    | "couponDef"
    | "stats"
  >("reports");
  const [reportPage, setReportPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [auctionPage, setAuctionPage] = useState(0);
  const [blockedPage, setBlockedPage] = useState(0);
  const [blockedUsersPage, setBlockedUsersPage] = useState(0);
  const [inquiryPage, setInquiryPage] = useState(0);
  const [withdrawalPage, setWithdrawalPage] = useState(0);
  const [statsDate, setStatsDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [blockAuctionReasonMap, setBlockAuctionReasonMap] = useState<Map<number, string>>(new Map());
  const [selectedUserReports, setSelectedUserReports] = useState<{
    userId: number;
    nickname: string;
  } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [couponReason, setCouponReason] = useState("");
  const [newCouponName, setNewCouponName] = useState("");
  const [newCouponAmount, setNewCouponAmount] = useState("");
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

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

  const { data: inquiriesPage, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["admin", "inquiries", inquiryPage],
    queryFn: () =>
      api
        .get<{ message: string; data: PageResponse<InquiryItem> }>(
          "/api/admin/inquiries",
          {
            params: {
              page: inquiryPage,
              size: 10,
            },
          }
        )
        .then(unwrapData),
    enabled: activeTab === "inquiries",
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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    enabled: activeTab === "categories",
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => couponApi.getAllCoupons(),
    enabled: activeTab === "coupons" || activeTab === "couponDef",
  });

  const { data: userReports, isLoading: userReportsLoading } = useQuery({
    queryKey: ["admin", "reports", "by-target", selectedUserReports?.userId],
    queryFn: () =>
      api
        .get<{ message: string; data: ReportItem[] }>(
          "/api/admin/reports/by-target",
          {
            params: {
              targetType: "USER",
              targetId: selectedUserReports!.userId,
            },
          }
        )
        .then(unwrapData),
    enabled: selectedUserReports !== null,
  });

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      api.patch(`/api/admin/users/${userId}/block`, { reason }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const unblockUserByNickname = useMutation({
    mutationFn: (nickname: string) =>
      api.patch(`/api/admin/users/unblock-by-nickname`, null, {
        params: { nickname },
      }),
    onSuccess: () => {
      // 차단 해제 요청 목록 새로고침 (백엔드에서 삭제되었으므로)
      queryClient.invalidateQueries({ queryKey: ["admin", "inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "blocked"] });
      addToast("차단 해제가 완료되었습니다.", "success");
    },
    onError: (err) => {
      addToast(getApiErrorMessage(err), "error");
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
  const inquiries = inquiriesPage?.content ?? [];
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

  const addCategory = useMutation({
    mutationFn: (body: { parentId: number | null; name: string }) =>
      categoryApi.add(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addToast("카테고리가 추가되었습니다.", "success");
      setNewCategoryName("");
      setNewCategoryParentId(null);
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: number) => categoryApi.delete(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      addToast("카테고리가 삭제되었습니다.", "success");
      setCategoryToDelete(null);
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const issueCoupon = useMutation({
    mutationFn: (body: CouponIssueReq) => couponApi.issueCoupon(body),
    onSuccess: () => {
      addToast("쿠폰이 발급되었습니다.", "success");
      setSelectedCouponId(null);
      setSelectedUserIds([]);
      setCouponReason("");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const createCoupon = useMutation({
    mutationFn: (body: { name: string; amount: number }) =>
      couponApi.createCoupon(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      addToast("쿠폰이 생성되었습니다.", "success");
      setNewCouponName("");
      setNewCouponAmount("");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const updateCoupon = useMutation({
    mutationFn: ({ couponId, body }: { couponId: number; body: { name: string; amount: number } }) =>
      couponApi.updateCoupon(couponId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      addToast("쿠폰이 수정되었습니다.", "success");
      setCouponToEdit(null);
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const deleteCoupon = useMutation({
    mutationFn: (couponId: number) => couponApi.deleteCoupon(couponId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      addToast("쿠폰이 삭제되었습니다.", "success");
      setCouponToDelete(null);
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  /** 평면 목록을 부모-자식 트리로 변환 */
  const categoryTree: CategoryTreeNodeType[] = (() => {
    const byId = new Map<number, CategoryTreeNodeType>();
    categories.forEach((c) => {
      byId.set(c.id, { ...c, children: [] });
    });
    const roots: CategoryTreeNodeType[] = [];
    byId.forEach((node) => {
      if (node.parentId == null) {
        roots.push(node);
      } else {
        const parent = byId.get(node.parentId);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    });
    return roots;
  })();

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
            onClick={() => setActiveTab("inquiries")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "inquiries"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">contact_support</span>
            차단 해제 요청
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
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "categories"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">category</span>
            카테고리 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("couponDef")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "couponDef"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">confirmation_number</span>
            쿠폰 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("coupons")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left w-full ${
              activeTab === "coupons"
                ? "bg-primary text-white font-semibold"
                : "text-text-muted hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined">send</span>
            쿠폰 발급
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
                          상태: {u.status} ·{" "}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUserReports({
                                userId: u.userId,
                                nickname: u.nickname,
                              })
                            }
                            className="text-primary hover:underline font-semibold"
                          >
                            신고 {u.reportCount}건
                          </button>
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
        {activeTab === "inquiries" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              차단 해제 요청
            </h1>
            {inquiriesLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {inquiries.map((inquiry) => (
                    <li
                      key={inquiry.inquiryId}
                      className="p-4 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">
                            요청 #{inquiry.inquiryId} - {inquiry.nickname}
                          </p>
                          <p className="text-sm text-text-muted mt-1">
                            이메일: {inquiry.email}
                          </p>
                          <p className="text-sm text-text-muted mt-2 whitespace-pre-wrap">
                            {inquiry.content}
                          </p>
                          <p className="text-xs text-text-muted mt-2">
                            요청일: {formatDateTime(inquiry.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (confirm(`${inquiry.nickname}님의 차단을 해제하시겠습니까?`)) {
                              unblockUserByNickname.mutate(inquiry.nickname);
                            }
                          }}
                          loading={unblockUserByNickname.isPending}
                        >
                          차단 해제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {inquiries.length === 0 && (
                  <p className="p-8 text-center text-text-muted">
                    차단 해제 요청이 없습니다.
                  </p>
                )}
                {inquiriesPage && !inquiriesPage.last && (
                  <div className="p-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setInquiryPage((p) => p + 1)}
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
        {activeTab === "categories" && (
          <div>
            <h1 className="text-2xl font-bold text-text-main mb-6">
              카테고리 관리
            </h1>
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-text-main mb-4">
                카테고리 추가
              </h2>
              <form
                className="flex flex-wrap gap-3 items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newCategoryName.trim();
                  if (!name) {
                    addToast("카테고리 이름을 입력하세요.", "error");
                    return;
                  }
                  addCategory.mutate({
                    parentId: newCategoryParentId,
                    name,
                  });
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    부모 카테고리
                  </label>
                  <select
                    value={newCategoryParentId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewCategoryParentId(
                        v === "" ? null : Number(v)
                      );
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <option value="">최상위 (루트)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    카테고리 이름
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="카테고리 이름"
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  loading={addCategory.isPending}
                >
                  추가
                </Button>
              </form>
            </div>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <h2 className="text-lg font-semibold text-text-main p-4 border-b border-border">
                카테고리 목록
              </h2>
              {categoriesLoading ? (
                <Skeleton className="h-48 w-full rounded-none" />
              ) : (
                <ul className="divide-y divide-border">
                  {categoryTree.map((node) => (
                    <CategoryTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      onDelete={(cat) => setCategoryToDelete(cat)}
                    />
                  ))}
                </ul>
              )}
              {!categoriesLoading && categoryTree.length === 0 && (
                <p className="p-8 text-center text-text-muted">
                  등록된 카테고리가 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-text-main">쿠폰 발급</h1>
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-text-main mb-4">쿠폰 발급</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedCouponId || selectedUserIds.length === 0 || !couponReason.trim()) {
                    addToast("쿠폰, 사용자, 사유를 모두 입력해주세요.", "error");
                    return;
                  }
                  issueCoupon.mutate({
                    couponId: selectedCouponId,
                    userIds: selectedUserIds,
                    reason: couponReason.trim(),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    쿠폰 선택
                  </label>
                  {couponsLoading ? (
                    <Skeleton className="h-10 w-full rounded-lg" />
                  ) : (
                    <select
                      value={selectedCouponId ?? ""}
                      onChange={(e) =>
                        setSelectedCouponId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      required
                    >
                      <option value="">쿠폰을 선택하세요</option>
                      {coupons.map((coupon) => (
                        <option key={coupon.couponId} value={coupon.couponId}>
                          {coupon.name} - {formatKrw(coupon.amount)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    발급 대상 사용자 선택
                  </label>
                  <div className="border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                    {usersLoading ? (
                      <Skeleton className="h-24 w-full rounded-lg" />
                    ) : (
                      <div className="space-y-2">
                        {usersPage?.content.map((user) => (
                          <label
                            key={user.userId}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.userId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds([...selectedUserIds, user.userId]);
                                } else {
                                  setSelectedUserIds(
                                    selectedUserIds.filter((id) => id !== user.userId)
                                  );
                                }
                              }}
                              className="w-4 h-4 text-primary rounded"
                            />
                            <span className="text-sm">
                              {user.nickname} ({user.email || "이메일 없음"})
                            </span>
                          </label>
                        ))}
                        {usersPage && usersPage.content.length === 0 && (
                          <p className="text-sm text-text-muted text-center py-4">
                            사용자가 없습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedUserIds.length > 0 && (
                    <p className="text-xs text-text-muted mt-2">
                      {selectedUserIds.length}명 선택됨
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    발급 사유
                  </label>
                  <textarea
                    value={couponReason}
                    onChange={(e) => setCouponReason(e.target.value)}
                    placeholder="쿠폰 발급 사유를 입력하세요"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[80px]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={issueCoupon.isPending}
                >
                  쿠폰 발급
                </Button>
              </form>
            </div>
          </div>
        )}
        {activeTab === "couponDef" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-text-main">쿠폰 관리</h1>
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-text-main mb-4">쿠폰 생성</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(newCouponAmount.replace(/\D/g, ""));
                  if (!newCouponName.trim() || amount <= 0) {
                    addToast("쿠폰 이름과 금액을 입력해주세요.", "error");
                    return;
                  }
                  createCoupon.mutate({
                    name: newCouponName.trim(),
                    amount: amount,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    쿠폰 이름
                  </label>
                  <input
                    type="text"
                    value={newCouponName}
                    onChange={(e) => setNewCouponName(e.target.value)}
                    placeholder="예: 신규 가입 축하 쿠폰"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    쿠폰 금액 (원)
                  </label>
                  <input
                    type="text"
                    value={newCouponAmount}
                    onChange={(e) =>
                      setNewCouponAmount(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10000"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={createCoupon.isPending}
                >
                  쿠폰 생성
                </Button>
              </form>
            </div>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <h2 className="text-lg font-semibold text-text-main p-4 border-b border-border">
                쿠폰 목록
              </h2>
              {couponsLoading ? (
                <Skeleton className="h-48 w-full rounded-none" />
              ) : (
                <ul className="divide-y divide-border">
                  {coupons.map((coupon) => (
                    <li
                      key={coupon.couponId}
                      className="p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-text-main">{coupon.name}</p>
                        <p className="text-sm text-text-muted">
                          {formatKrw(coupon.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCouponToEdit(coupon);
                            setNewCouponName(coupon.name);
                            setNewCouponAmount(coupon.amount.toString());
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setCouponToDelete(coupon)}
                        >
                          삭제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!couponsLoading && coupons.length === 0 && (
                <p className="p-8 text-center text-text-muted">
                  등록된 쿠폰이 없습니다.
                </p>
              )}
            </div>
            {couponToEdit && (
              <Modal
                open={!!couponToEdit}
                onClose={() => {
                  setCouponToEdit(null);
                  setNewCouponName("");
                  setNewCouponAmount("");
                }}
                title="쿠폰 수정"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amount = Number(newCouponAmount.replace(/\D/g, ""));
                    if (!newCouponName.trim() || amount <= 0) {
                      addToast("쿠폰 이름과 금액을 입력해주세요.", "error");
                      return;
                    }
                    updateCoupon.mutate({
                      couponId: couponToEdit.couponId,
                      body: {
                        name: newCouponName.trim(),
                        amount: amount,
                      },
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      쿠폰 이름
                    </label>
                    <input
                      type="text"
                      value={newCouponName}
                      onChange={(e) => setNewCouponName(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      쿠폰 금액 (원)
                    </label>
                    <input
                      type="text"
                      value={newCouponAmount}
                      onChange={(e) =>
                        setNewCouponAmount(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCouponToEdit(null);
                        setNewCouponName("");
                        setNewCouponAmount("");
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      loading={updateCoupon.isPending}
                    >
                      수정
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
            {couponToDelete && (
              <Modal
                open={!!couponToDelete}
                onClose={() => setCouponToDelete(null)}
                title="쿠폰 삭제 확인"
              >
                <div className="space-y-4">
                  <p className="text-text-main">
                    정말로 <strong>{couponToDelete.name}</strong> 쿠폰을 삭제하시겠습니까?
                  </p>
                  <p className="text-sm text-text-muted">
                    삭제된 쿠폰은 복구할 수 없습니다.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCouponToDelete(null)}
                    >
                      취소
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() => {
                        deleteCoupon.mutate(couponToDelete.couponId);
                      }}
                      loading={deleteCoupon.isPending}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </Modal>
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

      {/* 신고 목록 모달 */}
      <Modal
        open={selectedUserReports !== null}
        onClose={() => setSelectedUserReports(null)}
        title={`${selectedUserReports?.nickname}님의 신고 목록`}
      >
        {userReportsLoading ? (
          <div className="py-8">
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : userReports && userReports.length > 0 ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {userReports.map((report) => (
              <div
                key={report.reportId}
                className="p-4 border border-border rounded-xl bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">
                      신고 #{report.reportId}
                    </p>
                    <p className="text-xs text-text-muted">
                      신고자: {report.reporterNickname} · 상태: {report.status}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-text-main mt-2">{report.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-text-muted">
            신고 내역이 없습니다.
          </p>
        )}
      </Modal>

      {/* 카테고리 삭제 확인 모달 */}
      <Modal
        open={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        title="카테고리 삭제"
      >
        {categoryToDelete && (
          <>
            <p className="text-sm text-text-muted mb-4">
              이 카테고리와 하위 카테고리의 상품은 &quot;기타&quot;로 이동합니다.
              삭제하시겠습니까?
            </p>
            <p className="text-sm font-semibold text-text-main mb-4">
              삭제 대상: {categoryToDelete.name}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setCategoryToDelete(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteCategory.mutate(categoryToDelete.id)}
                loading={deleteCategory.isPending}
              >
                삭제
              </Button>
            </div>
          </>
        )}
      </Modal>
    </main>
  );
}
