import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { auctionApi } from "@/services/auctionApi";
import { bidApi } from "@/services/bidApi";
import { userApi } from "@/services/userApi";
import { orderApi } from "@/services/orderApi";
import { formatKrw } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";

export function AuctionResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const auctionId = Number(id);
  const isAuth = useAuthStore((s) => s.isAuthenticated());

  const chooseDeliveryType = useMutation({
    mutationFn: ({ orderId, type }: { orderId: number; type: "DIRECT" | "SHIPMENT" }) =>
      orderApi.chooseDeliveryType(orderId, type),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["order", "by-auction", auctionId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      addToast(
        res.deliveryType === "DIRECT" ? "직거래가 선택되었습니다." : "택배배송이 선택되었습니다.",
        "success"
      );
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

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

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
    enabled: isAuth,
  });

  // 경매 상태 확인 (auction이 없어도 안전하게 처리)
  const isSuccess = auction?.status === "SUCCESS";
  const isFailed = auction?.status === "FAILED";
  const isEnded = auction?.status === "ENDED";

  // 판매자인지 확인 (bidPage 없이도 확인 가능)
  const isMyAuction = useMemo(() => {
    if (!isAuth || !profile || !auction || auction.sellerId == null) return false;
    return profile.userId === auction.sellerId;
  }, [isAuth, profile, auction]);

  // 입찰에 참여했는지 확인 (bidPage 필요)
  const hasParticipated = useMemo(() => {
    if (!isAuth || !profile || !bidPage || bids.length === 0) return false;
    return bids.some(bid => bid.bidderNickname === profile.nickname);
  }, [isAuth, profile, bidPage, bids]);

  // 낙찰자 확인 (bidPage 필요) - SUCCESS 또는 ENDED 상태에서 확인
  const isWinner = useMemo(() => {
    if (!isAuth || !profile || !auction || (!isSuccess && !isEnded) || !bidPage || bids.length === 0) {
      return false;
    }
    const highestBid = bids.reduce((max, bid) => 
      bid.bidPrice > max.bidPrice ? bid : max
    );
    return highestBid.bidderNickname === profile.nickname;
  }, [isAuth, profile, auction, bidPage, bids, isSuccess, isEnded]);

  const needsOrder = (isSuccess || isEnded) && (isWinner || isMyAuction);
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", "by-auction", auctionId],
    queryFn: () => orderApi.getByAuction(auctionId),
    enabled: isAuth && !!auction && needsOrder,
    retry: 3,
  });

  if (isLoading || !auction) {
    return (
      <main className="flex flex-col items-center justify-center py-12 px-4">
        <Skeleton className="h-32 w-full max-w-md rounded-xl" />
      </main>
    );
  }
  const img = auction.imageUrls?.[0];

  // 메시지 결정 로직
  let message = "경매가 종료되었습니다";
  let icon = "cancel";
  
  // 유찰 상태는 인증 여부와 관계없이 동일하게 표시
  if (isFailed) {
    message = "경매가 유찰되었습니다";
    icon = "cancel";
  } 
  // 성공한 경매 또는 종료된 경매인 경우 (ENDED 상태도 성공/실패 판단 가능)
  else if (isSuccess || isEnded) {
    // 인증된 사용자이고 프로필이 있는 경우 사용자별 메시지 표시
    if (isAuth && profile) {
      // 판매자 확인 (bidPage 없이도 가능)
      if (isMyAuction) {
        if (isSuccess || (isEnded && auction.currentPrice > auction.startPrice)) {
          message = "경매가 성공적으로 끝났습니다";
          icon = "workspace_premium";
        } else {
          message = "경매가 종료되었습니다";
          icon = "cancel";
        }
      } 
      // 입찰 데이터가 로드된 경우 낙찰자/패찰자 확인
      else if (bidPage && bids.length > 0) {
        if (isWinner) {
          message = "경매에 성공하셨습니다";
          icon = "workspace_premium";
        } else if (hasParticipated) {
          message = "아쉽게 경매에 실패하셨습니다";
          icon = "sentiment_dissatisfied";
        } else {
          // 입찰에 참여하지 않은 경우
          if (isSuccess || (isEnded && auction.currentPrice > auction.startPrice)) {
            message = "경매가 성공적으로 종료되었습니다";
            icon = "workspace_premium";
          } else {
            message = "경매가 종료되었습니다";
            icon = "cancel";
          }
        }
      }
      // 입찰 데이터가 아직 없는 경우 (로딩 중이거나 입찰이 없음)
      else {
        if (isSuccess || (isEnded && auction.currentPrice > auction.startPrice)) {
          message = "경매가 성공적으로 종료되었습니다";
          icon = "workspace_premium";
        } else {
          message = "경매가 종료되었습니다";
          icon = "cancel";
        }
      }
    } 
    // 인증되지 않았거나 프로필이 없는 경우
    else {
      if (isSuccess || (isEnded && auction.currentPrice > auction.startPrice)) {
        message = "경매가 성공적으로 종료되었습니다";
        icon = "workspace_premium";
      } else {
        message = "경매가 종료되었습니다";
        icon = "cancel";
      }
    }
  }
  
  return (
    <main className="flex flex-col items-center justify-center relative py-12 px-4 min-h-[60vh]">
      <div className="max-w-[640px] w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-border">
        <div className="bg-primary/10 py-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-5xl">
              {icon}
            </span>
          </div>
          <h1 className="text-text-main tracking-tight text-[32px] font-bold leading-tight px-8 text-center">
            {message}
          </h1>
          {isAuth && isSuccess && (isWinner || isMyAuction) && (
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
          {((isSuccess || isEnded) && (isWinner || isMyAuction)) && (
            <div className="flex flex-col gap-4">
              {orderLoading ? (
                <div className="py-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : !order ? (
                <p className="text-sm text-text-muted py-2">
                  주문 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.
                </p>
              ) : order.deliveryType == null ? (
                <>
                  {isWinner ? (
                    <>
                      <p className="text-sm font-semibold text-text-main">
                        거래 방식을 선택해주세요
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="primary"
                          className="flex-1"
                          onClick={() =>
                            chooseDeliveryType.mutate({
                              orderId: order.orderId,
                              type: "DIRECT",
                            })
                          }
                          loading={
                            chooseDeliveryType.isPending &&
                            chooseDeliveryType.variables?.type === "DIRECT"
                          }
                        >
                          <span className="material-symbols-outlined">handshake</span>
                          직거래
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            chooseDeliveryType.mutate({
                              orderId: order.orderId,
                              type: "SHIPMENT",
                            })
                          }
                          loading={
                            chooseDeliveryType.isPending &&
                            chooseDeliveryType.variables?.type === "SHIPMENT"
                          }
                        >
                          <span className="material-symbols-outlined">local_shipping</span>
                          택배배송
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-text-muted py-2">
                      구매자가 거래 방식을 선택할 때까지 기다려주세요.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  {order.deliveryType === "DIRECT" && order.roomId && (
                    <Button
                      variant="primary"
                      className="flex-1 w-full"
                      onClick={() => navigate(`/chat?roomId=${order.roomId}`)}
                    >
                      <span className="material-symbols-outlined">chat</span>
                      1:1 채팅
                    </Button>
                  )}
                  <Link
                    to={`/delivery?orderId=${order.orderId}&auctionId=${auctionId}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <span className="material-symbols-outlined">
                        local_shipping
                      </span>
                      배송 정보
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/auctions/${auctionId}`}
              className="text-text-muted hover:text-primary text-sm font-medium transition-colors"
            >
              경매 상세로
            </Link>
            <span className="text-text-muted">·</span>
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
