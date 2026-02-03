import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/services/auctionApi";
import { api } from "@/lib/api";
import { formatKrw } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Wallet } from "@/lib/types";

export function AuctionResultPage() {
  const { id } = useParams<{ id: string }>();
  const auctionId = Number(id);

  const { data: auction, isLoading } = useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => auctionApi.getById(auctionId).then((r) => r.data),
    enabled: Number.isInteger(auctionId),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => api.get<Wallet>("/api/wallets/me").then((r) => r.data),
  });

  if (isLoading || !auction) {
    return (
      <main className="flex flex-col items-center justify-center py-12 px-4">
        <Skeleton className="h-32 w-full max-w-md rounded-xl" />
      </main>
    );
  }

  const isSuccess = auction.status === "SUCCESS";
  const img = auction.imageUrls?.[0];

  return (
    <main className="flex flex-col items-center justify-center relative py-12 px-4 min-h-[60vh]">
      <div className="max-w-[640px] w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-border">
        <div className="bg-primary/10 py-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-5xl">
              workspace_premium
            </span>
          </div>
          <h1 className="text-text-main tracking-tight text-[32px] font-bold leading-tight px-8 text-center">
            {isSuccess ? "낙찰을 축하합니다!" : "경매가 종료되었습니다"}
          </h1>
          {isSuccess && (
            <div className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold text-xl shadow-md">
              낙찰가: {formatKrw(auction.currentPrice)}
            </div>
          )}
        </div>
        <div className="p-8 flex flex-col gap-8">
          <div className="flex items-center gap-5 rounded-xl border border-border p-4 bg-gray-50">
            {img ? (
              <img
                src={img}
                alt={auction.title}
                className="size-24 object-cover rounded-lg shrink-0"
              />
            ) : (
              <div className="size-24 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-4xl text-text-muted">
                  image
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold leading-tight text-text-main">
                {auction.title}
              </p>
              <p className="text-text-muted text-sm">
                경매 #{auction.auctionId}
              </p>
              <Link
                to={`/auctions/${auctionId}`}
                className="mt-2 text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1"
              >
                상세 보기{" "}
                <span className="material-symbols-outlined text-sm">
                  open_in_new
                </span>
              </Link>
            </div>
          </div>
          {wallet && (
            <div className="rounded-xl border border-border p-6 bg-white">
              <div className="flex items-center gap-2 mb-4 text-text-main">
                <span className="material-symbols-outlined text-primary">
                  account_balance_wallet
                </span>
                <h3 className="font-bold">지갑 요약</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-text-muted text-sm">사용 가능 잔액</p>
                  <p className="text-sm font-medium">
                    {formatKrw(wallet.balance)}
                  </p>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center">
                  <p className="text-text-main font-bold">잔액</p>
                  <p className="text-primary font-bold">
                    {formatKrw(wallet.balance)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 1:1 채팅 미구현 */}
            <Button
              variant="secondary"
              className="flex-1 cursor-not-allowed opacity-60"
              disabled
              title="1:1 채팅 준비 중"
            >
              <span className="material-symbols-outlined">chat</span>
              1:1 채팅
            </Button>
            <Link to="/delivery" className="flex-1">
              <Button variant="outline" className="w-full">
                <span className="material-symbols-outlined">
                  local_shipping
                </span>
                배송 정보
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <Link
              to="/me"
              className="text-text-muted hover:text-primary text-sm font-medium transition-colors"
            >
              내 입찰 목록으로
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
