import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { auctionApi } from "@/services/auctionApi";
import { bidApi } from "@/services/bidApi";
import { userApi } from "@/services/userApi";
import { wishApi } from "@/services/wishApi";
import { reportApi } from "@/services/reportApi";
import { getApiErrorMessage } from "@/lib/api";
import { formatKrw, formatRelative } from "@/lib/format";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BidHistoryItemRes, RecommendedAuctionRes } from "@/lib/types";

function minNextBid(current: number): number {
  const next = Math.ceil((current * 1.1) / 10) * 10;
  return next > current ? next : current + 10;
}

/** 최소 입찰가: 최초 입찰(입찰 수 0)이면 등록가, 그 외에는 현재가 기준 10% 상승 */
function getMinBid(
  currentPrice: number,
  startPrice: number,
  bidCount: number
): number {
  if (bidCount === 0) return startPrice;
  return minNextBid(currentPrice);
}

export function AuctionDetailPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const id = Number(auctionId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const addToast = useToastStore((s) => s.add);

  const [bidAmount, setBidAmount] = useState("");
  const [localRecentBid, setLocalRecentBid] = useState<BidHistoryItemRes | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [wsSnapshot, setWsSnapshot] = useState<{
    currentPrice?: number;
    bidCount?: number;
    endAt?: string;
    status?: string;
  }>({});

  const {
    data: auction,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["auction", id],
    queryFn: () => auctionApi.getById(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });

  const { data: bidPage } = useQuery({
    queryKey: ["bid", id],
    queryFn: () => bidApi.list(id),
    enabled: Number.isInteger(id),
  });
  const bids = bidPage?.content ?? [];
  const delayedBidRefreshTimer = useRef<number | null>(null);

  const recentBids = useMemo(() => {
    if (!localRecentBid) return bids;
    const localNickname = localRecentBid.bidderNickname?.trim();
    const localTime = new Date(localRecentBid.createdAt).getTime();
    const exists = bids.some((bid) => {
      const sameBidId = bid.bidId > 0 && bid.bidId === localRecentBid.bidId;
      const sameBidder = bid.bidderNickname?.trim() === localNickname;
      const samePrice = bid.bidPrice === localRecentBid.bidPrice;
      const nearCreatedAt =
        Math.abs(new Date(bid.createdAt).getTime() - localTime) <= 15_000;
      return sameBidId || (sameBidder && samePrice && nearCreatedAt);
    });
    return exists ? bids : [localRecentBid, ...bids];
  }, [bids, localRecentBid]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
    enabled: isAuth,
  });

  useAuctionWebSocket(
    Number.isInteger(id) ? id : null,
    (data) =>
      setWsSnapshot((prev) =>
        Object.keys(data).length ? { ...prev, ...data } : prev
      ),
    (msg) => {
      // 경매 정보 무효화
      queryClient.invalidateQueries({ queryKey: ["auction", id] });
      // 입찰 성공 시 입찰 내역도 무효화하여 최근 입찰 목록 실시간 업데이트
      if (msg.type === "BID_SUCCESSED") {
        queryClient.invalidateQueries({ queryKey: ["bid", id] });
      }
    }
  );

  const currentPrice =
    wsSnapshot.currentPrice ??
    auction?.currentPrice ??
    auction?.startPrice ??
    0;
  const startPrice = auction?.startPrice ?? currentPrice;
  const bidCount = wsSnapshot.bidCount ?? auction?.bidCount ?? 0;
  const minBid = getMinBid(currentPrice, startPrice, bidCount);
  const endAt = wsSnapshot.endAt ?? auction?.endAt;
  const status = wsSnapshot.status ?? auction?.status;
  const isMyAuction =
    isAuth && profile && auction && auction.sellerId != null && profile.userId === auction.sellerId;
  const canBid =
    (status === "RUNNING" || status === "DEADLINE") && isAuth && !isMyAuction;
  
  // 경매 종료 후 낙찰자 확인 (최고 입찰자가 현재 사용자인지)
  const isWinner = useMemo(() => {
    if (!isAuth || !profile || !auction || status !== "SUCCESS" || bids.length === 0) {
      return false;
    }
    // 입찰 내역은 최신순이므로, 최고가 입찰을 찾아야 함
    const highestBid = bids.reduce((max, bid) => 
      bid.bidPrice > max.bidPrice ? bid : max
    );
    return highestBid.bidderNickname === profile.nickname;
  }, [isAuth, profile, auction, status, bids]);
  
  // 입찰에 참여했는지 확인
  const hasParticipated = useMemo(() => {
    if (!isAuth || !profile || bids.length === 0) return false;
    return bids.some(bid => bid.bidderNickname === profile.nickname);
  }, [isAuth, profile, bids]);

  const placeBid = useMutation({
    mutationFn: (amount: number) =>
      bidApi.place({
        auctionId: id,
        bidAmount: amount,
        requestId: crypto.randomUUID(),
      }),
    onSuccess: () => {
      addToast("입찰이 접수되었습니다.", "success");
      const amount = Number(bidAmount.replace(/,/g, ""));
      if (Number.isFinite(amount)) {
        setLocalRecentBid({
          bidId: -Date.now(),
          bidderNickname: profile?.nickname?.trim() || "나",
          bidPrice: amount,
          createdAt: new Date().toISOString(),
        });
      }
      setBidAmount("");
      queryClient.invalidateQueries({ queryKey: ["auction", id] });
      queryClient.invalidateQueries({ queryKey: ["bid", id] });
      if (delayedBidRefreshTimer.current != null) {
        window.clearTimeout(delayedBidRefreshTimer.current);
      }
      delayedBidRefreshTimer.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["bid", id] });
      }, 1200);
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const wishToggle = useMutation({
    mutationFn: (itemId: number) => wishApi.toggle(itemId),
    onSuccess: (data) => {
      addToast(data.wished ? "찜 목록에 추가되었습니다." : "찜이 해제되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["auction", id] });
      queryClient.invalidateQueries({ queryKey: ["wish"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const reportSubmit = useMutation({
    mutationFn: () =>
      reportApi.create({
        targetType: "AUCTION",
        targetId: id,
        reason: reportReason.trim(),
        description: reportDescription.trim() || undefined,
      }),
    onSuccess: () => {
      addToast("신고가 접수되었습니다. 검토 후 조치하겠습니다.", "success");
      setReportModalOpen(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const cancelAuction = useMutation({
    mutationFn: () => auctionApi.cancel(id),
    onSuccess: () => {
      addToast("경매가 취소되었습니다. 보증금은 등록 후 5분 이내 취소 시 환불됩니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["auction", id] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      navigate("/");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(bidAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < minBid) {
      addToast(
        `최소 입찰가는 ${formatKrw(minBid)}입니다.`,
        "error"
      );
      return;
    }
    placeBid.mutate(amount);
  };

  useEffect(() => {
    return () => {
      if (delayedBidRefreshTimer.current != null) {
        window.clearTimeout(delayedBidRefreshTimer.current);
      }
    };
  }, []);

  const [remaining, setRemaining] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => {
    setImgIndex(0);
  }, [id]);
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleEscape = (e: KeyboardEvent) =>
      e.key === "Escape" && setLightboxOpen(false);
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);
  useEffect(() => {
    if (!endAt) return;
    const update = () => {
      const sec = Math.max(
        0,
        Math.floor((new Date(endAt).getTime() - Date.now()) / 1000)
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
    "0"
  )}:${String(s).padStart(2, "0")}`;

  const invalidId = !Number.isInteger(id) || id <= 0;
  if (invalidId) {
    return (
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <p className="text-text-muted font-medium">잘못된 경매 번호입니다.</p>
          <Link
            to="/"
            className="mt-4 inline-block text-primary font-semibold hover:underline"
          >
            홈으로
          </Link>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <p className="text-text-muted font-medium">
            경매 정보를 불러올 수 없습니다.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {error && getApiErrorMessage(error)}
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-primary font-semibold hover:underline"
          >
            홈으로
          </Link>
        </div>
      </main>
    );
  }

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

  const images = auction.imageUrls?.filter(Boolean) ?? [];
  const currentImg = images[imgIndex];
  const recommendedAuctions = (auction.recommendedAuctions ?? [])
    .filter((item) => item.auctionId !== auction.auctionId)
    .slice(0, 5);

  return (
    <>
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
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 border border-border relative">
              {currentImg ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute inset-0 w-full h-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                    aria-label="사진 전체 보기"
                  >
                    <img
                      src={currentImg}
                      alt={`${auction.title} ${imgIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                    />
                  </button>
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgIndex((i) =>
                            i <= 0 ? images.length - 1 : i - 1
                          );
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
                        aria-label="이전 이미지"
                      >
                        <span className="material-symbols-outlined">
                          chevron_left
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgIndex((i) =>
                            i >= images.length - 1 ? 0 : i + 1
                          );
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
                        aria-label="다음 이미지"
                      >
                        <span className="material-symbols-outlined">
                          chevron_right
                        </span>
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImgIndex(i);
                            }}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              i === imgIndex
                                ? "bg-white scale-125"
                                : "bg-white/50 hover:bg-white/80"
                            }`}
                            aria-label={`이미지 ${i + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
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
                경매 #{auction.auctionId}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {auction.itemId != null && (
                <button
                  type="button"
                  onClick={() => wishToggle.mutate(auction.itemId!)}
                  disabled={wishToggle.isPending}
                  className={`p-3 border rounded-xl transition-colors ${
                    auction.isWished
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-gray-50 text-text-muted"
                  }`}
                  aria-label={auction.isWished ? "찜 해제" : "찜하기"}
                  title={auction.isWished ? "찜 해제" : "찜하기"}
                >
                  <span
                    className={`material-symbols-outlined ${auction.isWished ? "fill-icon" : ""}`}
                  >
                    favorite
                  </span>
                </button>
              )}
              {isAuth && (
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="p-3 border border-border rounded-xl hover:bg-gray-50 text-text-muted transition-colors"
                  aria-label="신고"
                  title="이 경매 신고하기"
                >
                  <span className="material-symbols-outlined">flag</span>
                </button>
              )}
            </div>
          </div>

          <Modal
            open={reportModalOpen}
            onClose={() => {
              setReportModalOpen(false);
              setReportReason("");
              setReportDescription("");
            }}
            title="경매 신고"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reportReason.trim()) {
                  addToast("신고 사유를 입력해 주세요.", "error");
                  return;
                }
                reportSubmit.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1.5">
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="예: 허위 정보, 부적절한 내용"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1.5">
                  상세 설명 (선택)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="추가로 전달할 내용이 있으면 입력해 주세요."
                  rows={3}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportReason("");
                    setReportDescription("");
                  }}
                >
                  취소
                </Button>
                <Button type="submit" loading={reportSubmit.isPending}>
                  신고하기
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            open={cancelModalOpen}
            onClose={() => setCancelModalOpen(false)}
            title="경매 취소 확인"
          >
            <div className="space-y-4">
              <p className="text-text-main">
                정말로 이 경매를 취소하시겠습니까?
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-2">보증금 안내:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>등록 후 5분 이내 취소: 보증금 전액 환불</li>
                  <li>등록 후 5분 이후 취소: 보증금 몰수 (환불 불가)</li>
                </ul>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCancelModalOpen(false)}
                >
                  돌아가기
                </Button>
                <Button
                  variant="danger"
                  onClick={() => cancelAuction.mutate()}
                  loading={cancelAuction.isPending}
                >
                  경매 취소
                </Button>
              </div>
            </div>
          </Modal>

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
                {status === "DEADLINE" ? (
                  <div className="text-2xl font-bold text-red-500">
                    마감임박!
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
                      남은 시간
                    </p>
                    <div className="text-3xl font-bold font-mono tabular-nums tracking-tight">
                      {remaining > 0 ? timeStr : "종료"}
                    </div>
                  </>
                )}
              </div>
            </div>

            {canBid && (
              <form onSubmit={handleBid} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBidAmount(String(minBid))}
                    className="py-3 px-4 border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all"
                  >
                    {bidCount === 0 ? "등록가" : `+${formatKrw(minBid - currentPrice)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBidAmount(String(minBid * 2))}
                    className="py-3 px-4 border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all"
                  >
                    +{formatKrw(minBid)}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-5 text-text-muted font-bold text-xl">
                    ₩
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={String(minBid)}
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
                    {formatKrw(minBid)}
                  </span>
                </p>
              </form>
            )}

            {(status === "RUNNING" || status === "DEADLINE") && isMyAuction && (
              <div className="mt-6 py-4 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined">info</span>
                <p className="font-medium">
                  본인이 등록한 경매에는 입찰할 수 없습니다.
                </p>
              </div>
            )}

            {isMyAuction && (status === "READY" || status === "RUNNING") && (
              <div className="mt-6">
                {bidCount > 0 ? (
                  <div className="py-4 px-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    <p className="font-medium">
                      입찰이 진행된 경매는 취소할 수 없습니다.
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => setCancelModalOpen(true)}
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    경매 취소
                  </Button>
                )}
              </div>
            )}

            {(status === "SUCCESS" || status === "FAILED" || status === "ENDED") && (
              <div className="mt-6 space-y-4">
                {isAuth && (
                  <>
                    {isMyAuction && status === "SUCCESS" ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                            check_circle
                          </span>
                          <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                            경매가 성공적으로 끝났습니다
                          </h3>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                          낙찰가: {formatKrw(currentPrice)}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link to="/chat" className="flex-1">
                            <Button variant="primary" className="w-full">
                              <span className="material-symbols-outlined">chat</span>
                              1:1 채팅
                            </Button>
                          </Link>
                          <Link to={`/delivery?auctionId=${id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              <span className="material-symbols-outlined">local_shipping</span>
                              배송 정보
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : hasParticipated && status === "SUCCESS" && isWinner ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                            check_circle
                          </span>
                          <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                            경매에 성공하셨습니다
                          </h3>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                          낙찰가: {formatKrw(currentPrice)}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link to="/chat" className="flex-1">
                            <Button variant="primary" className="w-full">
                              <span className="material-symbols-outlined">chat</span>
                              1:1 채팅
                            </Button>
                          </Link>
                          <Link to={`/delivery?auctionId=${id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              <span className="material-symbols-outlined">local_shipping</span>
                              배송 정보
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : hasParticipated && status === "SUCCESS" && !isWinner ? (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-3xl">
                            sentiment_dissatisfied
                          </span>
                          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                            아쉽게 경매에 실패하셨습니다
                          </p>
                        </div>
                      </div>
                    ) : status === "FAILED" ? (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-3xl">
                            cancel
                          </span>
                          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                            경매가 유찰되었습니다
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
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
                {recentBids.slice(0, 20).map((bid, i) => (
                  <BidRow key={bid.bidId ?? i} bid={bid} />
                ))}
                {recentBids.length === 0 && (
                  <p className="p-4 text-text-muted text-sm">
                    아직 입찰이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 flex items-center justify-between">
            <Link
              to={auction.sellerId != null ? `/users/${auction.sellerId}` : "#"}
              className={`flex items-center gap-4 ${auction.sellerId != null ? "hover:opacity-80 transition-opacity" : ""}`}
            >
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
            </Link>
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

      {recommendedAuctions.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">recommend</span>
            <h2 className="text-xl font-bold text-text-main">추천 경매</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {recommendedAuctions.map((recommended) => (
              <RecommendedAuctionCard
                key={recommended.auctionId}
                auction={recommended}
              />
            ))}
          </div>
        </section>
      )}
    </main>

    {lightboxOpen && currentImg && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="사진 전체 보기"
        onClick={() => setLightboxOpen(false)}
      >
        <button
          type="button"
          onClick={() => setLightboxOpen(false)}
          className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImgIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              aria-label="이전 이미지"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImgIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              aria-label="다음 이미지"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </>
        )}
        <img
          src={currentImg}
          alt={`${auction.title} ${imgIndex + 1}`}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain cursor-zoom-out"
          onClick={(e) => e.stopPropagation()}
        />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          {imgIndex + 1} / {images.length}
        </p>
      </div>
    )}
    </>
  );
}

function RecommendedAuctionCard({ auction }: { auction: RecommendedAuctionRes }) {
  const imageUrl = auction.thumbnailUrl ?? auction.imageUrls?.[0];

  return (
    <Link
      to={`/auctions/${auction.auctionId}`}
      className="group rounded-2xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-4xl">image</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-text-main line-clamp-1">
          {auction.title}
        </p>
      </div>
    </Link>
  );
}

function BidRow({ bid }: { bid: BidHistoryItemRes }) {
  const bidderName = bid.bidderNickname?.trim() || "입찰자";
  return (
    <div className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
      <div className="flex items-center gap-4">
        <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          <span className="text-primary font-bold text-sm">
            {bidderName[0] ?? "?"}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold">{bidderName}</p>
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
