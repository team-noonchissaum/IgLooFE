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

function minNextBid(current: number): number {
  const next = Math.ceil((current * 1.1) / 10) * 10;
  return next > current ? next : current + 10;
}

export function AuctionLivePage() {
  const { id } = useParams<{ id: string }>();
  const auctionId = Number(id);
  const queryClient = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const addToast = useToastStore((s) => s.add);
  const [wsSnapshot, setWsSnapshot] = useState<{
    currentPrice?: number;
    bidCount?: number;
    endAt?: string;
  }>({});

  const { data: auction, isLoading } = useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => auctionApi.getById(auctionId),
    enabled: Number.isInteger(auctionId),
  });

  const { data: bidPage } = useQuery({
    queryKey: ["bid", auctionId],
    queryFn: () => bidApi.list(auctionId),
    enabled: Number.isInteger(auctionId),
  });
  const bids = bidPage?.content ?? [];

  useAuctionWebSocket(
    Number.isInteger(auctionId) ? auctionId : null,
    (data) => setWsSnapshot(data),
    () => queryClient.invalidateQueries({ queryKey: ["bid", auctionId] })
  );

  const currentPrice =
    wsSnapshot.currentPrice ??
    auction?.currentPrice ??
    auction?.startPrice ??
    0;
  const bidCount = wsSnapshot.bidCount ?? auction?.bidCount ?? 0;
  const endAt = wsSnapshot.endAt ?? auction?.endAt;
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endAt) return;
    const update = () =>
      setRemaining(
        Math.max(0, Math.floor((new Date(endAt).getTime() - Date.now()) / 1000))
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endAt]);

  const placeBid = useMutation({
    mutationFn: (amount: number) =>
      bidApi.place({
        auctionId,
        bidAmount: amount,
        requestId: crypto.randomUUID(),
      }),
    onSuccess: () => {
      addToast("입찰이 접수되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["auction", auctionId] });
      queryClient.invalidateQueries({ queryKey: ["bid", auctionId] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const handleQuickBid = (delta: number) => {
    const amount = minNextBid(currentPrice) + delta;
    if (!isAuth) {
      addToast("로그인이 필요합니다.", "error");
      return;
    }
    placeBid.mutate(amount);
  };

  if (isLoading || !auction) {
    return (
      <main className="max-w-[1600px] mx-auto px-4 md:px-10 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex flex-col xl:flex-row gap-6">
          <Skeleton className="flex-1 min-h-[500px] rounded-xl" />
          <Skeleton className="xl:w-80 h-96 rounded-xl" />
        </div>
      </main>
    );
  }

  const img = auction.imageUrls?.[0];
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return (
    <main className="flex flex-col xl:flex-row px-4 md:px-10 xl:px-20 py-6 gap-6 max-w-[1600px] mx-auto w-full">
      <aside className="w-full xl:w-64 flex flex-col gap-4">
        <nav className="flex flex-wrap gap-2 mb-2 text-sm">
          <Link to="/" className="text-text-muted hover:underline">
            홈
          </Link>
          <span className="text-text-muted">/</span>
          <Link
            to={`/auctions/${auctionId}`}
            className="text-text-muted hover:underline"
          >
            경매 #{auctionId}
          </Link>
        </nav>
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              military_tech
            </span>
            상위 입찰
          </h3>
          <div className="flex flex-col gap-4">
            {bids.slice(0, 5).map((bid, i) => (
              <div
                key={bid.bidId ?? i}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  i === 0 ? "bg-primary/10 border-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold">
                    {bid.bidderNickname}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary">
                  {formatKrw(bid.bidPrice)}
                </span>
              </div>
            ))}
            {bids.length === 0 && (
              <p className="text-sm text-text-muted">아직 입찰 없음</p>
            )}
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col gap-6">
        <div className="relative group overflow-hidden rounded-xl bg-white shadow-lg border border-border">
          <div
            className="min-h-[500px] flex flex-col justify-end bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={
              img
                ? { backgroundImage: `url(${img})` }
                : { background: "#f1f3f5" }
            }
          >
            {img && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg">
              <span className="size-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
            <div className="relative p-6 text-white">
              <h1 className="text-3xl font-extrabold tracking-tight">
                {auction.title}
              </h1>
              <p className="text-sm opacity-90 mt-1">
                {auction.description?.slice(0, 80)}...
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border shadow-md">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 grid grid-cols-3 gap-3 w-full">
              <Button variant="secondary" onClick={() => handleQuickBid(0)}>
                +1,000
              </Button>
              <Button variant="secondary" onClick={() => handleQuickBid(5000)}>
                +5,000
              </Button>
              <Button variant="secondary" onClick={() => handleQuickBid(10000)}>
                +10,000
              </Button>
            </div>
            <Link to={`/auctions/${auctionId}`} className="w-full md:w-auto">
              <Button className="min-w-[200px] py-3.5">
                상세에서 입찰하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <aside className="w-full xl:w-80 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="text-center pb-4 mb-4 border-b border-border">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
              현재 최고가
            </p>
            <h2 className="text-4xl font-black text-primary">
              {formatKrw(currentPrice)}
            </h2>
          </div>
          <p className="text-[10px] text-center font-bold uppercase text-text-muted mb-3">
            남은 시간
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex h-14 items-center justify-center rounded-lg bg-red-50 border border-red-200">
                <p className="text-xl font-black">
                  {String(h).padStart(2, "0")}
                </p>
              </div>
              <p className="text-[10px] font-bold uppercase opacity-60">시</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex h-14 items-center justify-center rounded-lg bg-red-50 border border-red-200">
                <p className="text-xl font-black">
                  {String(m).padStart(2, "0")}
                </p>
              </div>
              <p className="text-[10px] font-bold uppercase opacity-60">분</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex h-14 items-center justify-center rounded-lg bg-red-600 text-white">
                <p className="text-xl font-black">
                  {String(s).padStart(2, "0")}
                </p>
              </div>
              <p className="text-[10px] font-bold uppercase opacity-60">초</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border flex-1 flex flex-col shadow-sm max-h-[400px]">
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="size-2 bg-green-500 rounded-full animate-pulse" />
              실시간 입찰
            </h3>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-border">
              {bidCount} 입찰
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {bids.slice(0, 10).map((bid, i) => (
              <div key={bid.bidId ?? i} className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {bid.bidderNickname?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-bold">
                      {bid.bidderNickname}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {bid.createdAt ? formatRelative(bid.createdAt) : "-"}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                      i === 0
                        ? "bg-primary/10 text-primary border-primary/10"
                        : "bg-gray-100 border-border"
                    }`}
                  >
                    {formatKrw(bid.bidPrice)} 입찰
                  </div>
                </div>
              </div>
            ))}
            {bids.length === 0 && (
              <p className="text-sm text-text-muted">아직 입찰이 없습니다.</p>
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
