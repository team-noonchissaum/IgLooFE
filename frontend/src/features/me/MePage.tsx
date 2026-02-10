import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { userApi } from "@/services/userApi";
import { walletApi } from "@/services/walletApi";
import { bidApi } from "@/services/bidApi";
import { formatDateTime, formatKrw } from "@/lib/format";
import { MeSidebar } from "@/components/layout/MeSidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const MY_AUCTIONS_PAGE_SIZE = 5;

export function MePage() {
  const [myAuctionPage, setMyAuctionPage] = useState(0);

  const { data: mypage, isLoading } = useQuery({
    queryKey: ["users", "me", "mypage"],
    queryFn: () => userApi.getMypage(),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMe(),
  });

  const { data: myBidsPage } = useQuery({
    queryKey: ["bid", "my"],
    queryFn: () => bidApi.myBids(),
  });
  const myBids = myBidsPage?.content ?? [];

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
                myBids.slice(0, 10).map((b) => {
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
                })
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
