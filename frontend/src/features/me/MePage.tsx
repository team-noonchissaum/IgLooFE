import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/services/userApi";
import { walletApi } from "@/services/walletApi";
import { bidApi } from "@/services/bidApi";
import { categoryApi } from "@/services/categoryApi";
import { formatDateTime, formatKrw } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { MeSidebar } from "@/components/layout/MeSidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const MY_AUCTIONS_PAGE_SIZE = 5;
const MY_BIDS_PAGE_SIZE = 10;

export function MePage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [myBidPage, setMyBidPage] = useState(0);
  const [myAuctionPage, setMyAuctionPage] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  const { data: mypage, isLoading } = useQuery({
    queryKey: ["users", "me", "mypage"],
    queryFn: () => userApi.getMypage(),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMe(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    retry: false,
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["users", "me", "category-subscriptions"],
    queryFn: () => userApi.getCategorySubscriptions(),
    retry: false,
  });

  const addCategorySubscription = useMutation({
    mutationFn: (categoryId: number) => userApi.addCategorySubscription(categoryId),
    onSuccess: () => {
      addToast("관심 카테고리가 등록되었습니다.", "success");
      setSelectedCategoryId("");
      queryClient.invalidateQueries({
        queryKey: ["users", "me", "category-subscriptions"],
      });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const removeCategorySubscription = useMutation({
    mutationFn: (categoryId: number) => userApi.removeCategorySubscription(categoryId),
    onSuccess: () => {
      addToast("관심 카테고리가 해제되었습니다.", "success");
      queryClient.invalidateQueries({
        queryKey: ["users", "me", "category-subscriptions"],
      });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const { data: myBidsPage } = useQuery({
    queryKey: ["bid", "my", myBidPage],
    queryFn: () => bidApi.myBids({ page: myBidPage, size: MY_BIDS_PAGE_SIZE }),
  });
  const myBids = myBidsPage?.content ?? [];
  const myBidsLast = myBidsPage?.last ?? true;
  const myBidsTotalPages = myBidsPage?.totalPages ?? 0;

  const { data: myAuctionsPage } = useQuery({
    queryKey: ["users", "me", "auctions", myAuctionPage],
    queryFn: () =>
      userApi.getMyAuctions({ page: myAuctionPage, size: MY_AUCTIONS_PAGE_SIZE }),
  });
  const myAuctions = myAuctionsPage?.content ?? [];
  const myAuctionsLast = myAuctionsPage?.last ?? true;
  const myAuctionsTotalPages = myAuctionsPage?.totalPages ?? 0;

  const balance = mypage?.balance ?? wallet?.balance ?? 0;

  if (isLoading || !mypage) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <MeSidebar />
          <section className="flex-1">
            <Skeleton className="h-32 w-full rounded-xl mb-6" />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <MeSidebar />
        <section className="flex-1">
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                account_balance_wallet
              </span>
              지갑 잔액
            </h2>
            <p className="text-3xl font-black text-primary">
              {formatKrw(balance)}
            </p>
            <Link to="/credits/charge" className="inline-block mt-4">
              <span className="text-primary font-semibold text-sm hover:underline">
                충전하기
              </span>
            </Link>
          </div>
          <section className="mb-6 space-y-4 bg-white rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-text-main">관심 카테고리</h2>
            <p className="text-sm text-text-muted">
              관심 카테고리를 설정하면 해당 카테고리 경매 알림을 더 빠르게 받을 수 있습니다.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategoryId}
                onChange={(e) =>
                  setSelectedCategoryId(e.target.value ? Number(e.target.value) : "")
                }
                className="min-w-[240px] rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">카테고리 선택</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={() => {
                  if (selectedCategoryId === "") {
                    addToast("카테고리를 선택해 주세요.", "info");
                    return;
                  }
                  const alreadySelected = (subscriptions?.subscriptions ?? []).some(
                    (item) => item.categoryId === selectedCategoryId
                  );
                  if (alreadySelected) {
                    addToast("이미 등록된 관심 카테고리입니다.", "info");
                    return;
                  }
                  addCategorySubscription.mutate(selectedCategoryId);
                }}
                loading={addCategorySubscription.isPending}
              >
                등록
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(subscriptions?.subscriptions ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">등록된 관심 카테고리가 없습니다.</p>
              ) : (
                (subscriptions?.subscriptions ?? []).map((item) => (
                  <span
                    key={item.categoryId}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold"
                  >
                    {item.categoryName}
                    <button
                      type="button"
                      className="material-symbols-outlined text-base leading-none hover:text-red-500"
                      onClick={() => removeCategorySubscription.mutate(item.categoryId)}
                      aria-label={`${item.categoryName} 해제`}
                      title="해제"
                    >
                      close
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                gavel
              </span>
              내 입찰 참여 경매
            </h2>
            <ul className="divide-y divide-border">
              {myBids.length === 0 ? (
                <li className="py-8 text-center text-text-muted">
                  참여한 경매가 없습니다.
                </li>
              ) : (
                <>
                {myBids.map((b) => {
                  const isEnded = b.auctionStatus === "SUCCESS" || 
                                  b.auctionStatus === "FAILED" || 
                                  b.auctionStatus === "ENDED";
                  return (
                    <li
                      key={`${b.auctionId}-${b.myHighestBidPrice}`}
                      className="py-3 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center">
                        <Link
                          to={`/auctions/${b.auctionId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {b.itemTitle} (경매 #{b.auctionId})
                        </Link>
                        <span className="font-bold">
                          {formatKrw(b.myHighestBidPrice)}
                          {b.isHighestBidder && (
                            <span className="text-primary text-xs ml-1">
                              최고가
                            </span>
                          )}
                        </span>
                      </div>
                      {isEnded && (
                        <Link to={`/auctions/${b.auctionId}/result`} className="self-start">
                          <Button variant="outline" size="sm">
                            경매 결과 보기
                          </Button>
                        </Link>
                      )}
                    </li>
                  );
                })}
                {myBidsTotalPages > 1 && (
                  <li className="py-3 flex items-center justify-center gap-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={myBidPage <= 0}
                      onClick={() => setMyBidPage((p) => p - 1)}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-text-muted">
                      {myBidPage + 1} / {myBidsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={myBidsLast}
                      onClick={() => setMyBidPage((p) => p + 1)}
                    >
                      다음
                    </Button>
                  </li>
                )}
                </>
              )}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                inventory
              </span>
              내 등록 경매
            </h2>
            <ul className="divide-y divide-border">
              {myAuctions.length === 0 ? (
                <li className="py-8 text-center text-text-muted">
                  등록한 경매가 없습니다.
                </li>
              ) : (
                <>
                  {myAuctions.map((a) => {
                    const isEnded = a.status === "SUCCESS" || 
                                    a.status === "FAILED" || 
                                    a.status === "ENDED";
                    return (
                      <li
                        key={a.auctionId}
                        className="py-3 flex flex-col gap-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <Link
                              to={`/auctions/${a.auctionId}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {a.title}
                            </Link>
                            <p className="text-xs text-text-muted">
                              종료: {formatDateTime(a.endAt)}
                            </p>
                          </div>
                          <div className="text-sm text-text-main font-semibold">
                            {formatKrw(a.currentPrice)}
                            <span className="text-xs text-text-muted ml-2">
                              {a.status}
                            </span>
                          </div>
                        </div>
                        {isEnded && (
                          <Link to={`/auctions/${a.auctionId}/result`} className="self-start">
                            <Button variant="outline" size="sm">
                              경매 결과 보기
                            </Button>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                  {myAuctionsTotalPages > 1 && (
                    <li className="py-3 flex items-center justify-center gap-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={myAuctionPage <= 0}
                        onClick={() => setMyAuctionPage((p) => p - 1)}
                      >
                        이전
                      </Button>
                      <span className="text-sm text-text-muted">
                        {myAuctionPage + 1} / {myAuctionsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={myAuctionsLast}
                        onClick={() => setMyAuctionPage((p) => p + 1)}
                      >
                        다음
                      </Button>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
