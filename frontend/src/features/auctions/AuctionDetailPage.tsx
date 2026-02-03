import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/services/auctionApi";
import { bidApi } from "@/services/bidApi";
import { useAuthStore } from "@/stores/authStore";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { formatKrw, formatRelative } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BidHistoryItemRes } from "@/lib/types";

function minNextBid(current: number): number {
  const next = Math.ceil((current * 1.1) / 10) * 10;
  return next > current ? next : current + 10;
}

export function AuctionDetailPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const id = Number(auctionId);
  const queryClient = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const addToast = useToastStore((s) => s.add);

  const [bidAmount, setBidAmount] = useState("");
  const [wsSnapshot, setWsSnapshot] = useState<{
    currentPrice?: number;
    bidCount?: number;
    endAt?: string;
    status?: string;
  }>({});

  const { data: auction, isLoading } = useQuery({
    queryKey: ["auction", id],
    queryFn: () => auctionApi.getById(id),
    enabled: Number.isInteger(id),
  });

  const { data: bidPage } = useQuery({
    queryKey: ["bid", id],
    queryFn: () => bidApi.list(id),
    enabled: Number.isInteger(id),
  });
  const bids = bidPage?.content ?? [];

  useAuctionWebSocket(
    Number.isInteger(id) ? id : null,
    (data) => setWsSnapshot(data),
    () => queryClient.invalidateQueries({ queryKey: ["auction", id] }),
  );

  const currentPrice =
    wsSnapshot.currentPrice ??
    auction?.currentPrice ??
    auction?.startPrice ??
    0;
  const bidCount = wsSnapshot.bidCount ?? auction?.bidCount ?? 0;
  const endAt = wsSnapshot.endAt ?? auction?.endAt;
  const status = wsSnapshot.status ?? auction?.status;
  const canBid = (status === "RUNNING" || status === "DEADLINE") && isAuth;

  const placeBid = useMutation({
    mutationFn: (amount: number) =>
      bidApi.place({
        auctionId: id,
        bidAmount: amount,
        requestId: crypto.randomUUID(),
      }),
    onSuccess: () => {
      addToast("입찰이 접수되었습니다.", "success");
      setBidAmount("");
      queryClient.invalidateQueries({ queryKey: ["auction", id] });
      queryClient.invalidateQueries({ queryKey: ["bid", id] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(bidAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < minNextBid(currentPrice)) {
      addToast(
        `최소 입찰가는 ${formatKrw(minNextBid(currentPrice))}입니다.`,
        "error",
      );
      return;
    }
    placeBid.mutate(amount);
  };

  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endAt) return;
    const update = () => {
      const sec = Math.max(
        0,
        Math.floor((new Date(endAt).getTime() - Date.now()) / 1000),
      );
      setRemaining(sec);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endAt]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0",
  )}:${String(s).padStart(2, "0")}`;

  if (isLoading || !auction) {
    return (
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    );
  }

  const img = auction.imageUrls?.[0];

  return (
    <main className="max-w-[1280px] mx-auto px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary">
          홈
        </Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-text-main font-medium">{auction.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative group">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 border border-border">
              {img ? (
                <img
                  src={img}
                  alt={auction.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-6xl">
                    image
                  </span>
                </div>
              )}
            </div>
            {(status === "RUNNING" || status === "DEADLINE") && (
              <div className="absolute top-6 left-6 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-2 shadow-lg">
                <span className="live-dot-blue bg-white" />
                Live
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl p-6 border border-border">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined">description</span>
              상품 설명
            </h3>
            <p className="text-text-muted leading-relaxed">
              {auction.description || "설명 없음"}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                {auction.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-text-muted text-sm">
                경매 #{auction.id}
              </div>
            </div>
            {/* 찜: 부분구현 - 상세 DTO에 itemId 없으면 버튼만 비활성/툴팁 */}
            <button
              type="button"
              className="p-3 border border-border rounded-xl hover:bg-gray-50 text-text-muted cursor-not-allowed"
              title="찜 기능은 상품별 itemId가 있을 때 사용 가능합니다"
              disabled
              aria-label="찜 (준비 중)"
            >
              <span className="material-symbols-outlined">favorite</span>
            </button>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
                  현재 최고가
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary tracking-tighter">
                    {formatKrw(currentPrice)}
                  </span>
                  <span className="text-sm font-bold text-green-500 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-sm">
                      trending_up
                    </span>
                    {bidCount}입찰
                  </span>
                </div>
              </div>
              <div className="md:text-right">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
                  남은 시간
                </p>
                <div className="text-3xl font-bold font-mono tabular-nums tracking-tight">
                  {remaining > 0 ? timeStr : "종료"}
                </div>
              </div>
            </div>

            {canBid && (
              <form onSubmit={handleBid} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBidAmount(String(minNextBid(currentPrice)))
                    }
                    className="py-3 px-4 border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all"
                  >
                    +{formatKrw(minNextBid(currentPrice) - currentPrice)}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBidAmount(String(minNextBid(currentPrice) * 2))
                    }
                    className="py-3 px-4 border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all"
                  >
                    +{formatKrw(minNextBid(currentPrice))}
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="absolute left-5 text-text-muted font-bold text-xl">
                    ₩
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={String(minNextBid(currentPrice))}
                    value={bidAmount}
                    onChange={(e) =>
                      setBidAmount(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full bg-gray-50 border border-border rounded-2xl py-4 pl-10 pr-4 text-2xl font-black focus:ring-primary focus:border-primary"
                    aria-label="입찰 금액"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-5 text-lg"
                  loading={placeBid.isPending}
                >
                  <span className="material-symbols-outlined text-2xl">
                    gavel
                  </span>
                  입찰하기
                </Button>
                <p className="text-[11px] text-text-muted font-medium">
                  최소 입찰가:{" "}
                  <span className="font-bold text-text-main">
                    {formatKrw(minNextBid(currentPrice))}
                  </span>
                </p>
              </form>
            )}

            {(status === "ENDED" ||
              status === "SUCCESS" ||
              status === "FAILED") && (
              <div className="mt-6">
                <Link to={`/auctions/${id}/result`}>
                  <Button variant="outline" className="w-full">
                    경매 결과 보기
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden flex-1 min-h-[300px] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold flex items-center gap-2">
                <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                최근 입찰
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
              <div className="divide-y divide-border">
                {bids.slice(0, 20).map((bid, i) => (
                  <BidRow key={bid.bidId ?? i} bid={bid} />
                ))}
                {bids.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">
                    아직 입찰이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">
                  person
                </span>
              </div>
              <div>
                <p className="font-bold">
                  {auction.sellerNickname ?? "판매자"}
                </p>
                <p className="text-xs text-text-muted">판매자</p>
              </div>
            </div>
            {/* 1:1 채팅 미구현 */}
            <button
              type="button"
              className="text-xs font-bold px-5 py-2.5 bg-gray-100 border border-border rounded-xl cursor-not-allowed opacity-60"
              disabled
              title="1:1 채팅은 준비 중입니다"
            >
              문의하기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function BidRow({ bid }: { bid: BidHistoryItemRes }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
      <div className="flex items-center gap-4">
        <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          <span className="text-primary font-bold text-sm">
            {bid.bidderNickname?.[0] ?? "?"}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold">{bid.bidderNickname}</p>
          <p className="text-[11px] text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">
              schedule
            </span>
            {bid.createdAt ? formatRelative(bid.createdAt) : "-"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-lg text-primary tracking-tight">
          {formatKrw(bid.bidPrice)}
        </p>
      </div>
    </div>
  );
}
