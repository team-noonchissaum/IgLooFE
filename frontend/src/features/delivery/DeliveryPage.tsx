import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { orderApi, type SaveAddressReq } from "@/services/orderApi";
import { auctionApi } from "@/services/auctionApi";
import { userApi } from "@/services/userApi";
import { useToastStore } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/api";

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

const DEFAULT_ADDRESS_FORM: SaveAddressReq = {
  recipientName: "",
  recipientPhone: "",
  zipCode: "",
  address1: "",
  address2: "",
  deliveryMemo: "",
};

export function DeliveryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);

  const auctionId = parsePositiveInt(searchParams.get("auctionId"));
  const orderIdFromQuery = parsePositiveInt(searchParams.get("orderId"));

  const [addressForm, setAddressForm] = useState<SaveAddressReq>(DEFAULT_ADDRESS_FORM);
  const [carrierCode, setCarrierCode] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
  });

  const { data: auction } = useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => auctionApi.getById(auctionId as number),
    enabled: auctionId != null,
    retry: false,
  });

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", "by-auction", auctionId],
    queryFn: () => orderApi.getByAuction(auctionId as number),
    enabled: auctionId != null,
    retry: false,
  });

  const effectiveOrderId = orderIdFromQuery ?? order?.orderId ?? null;
  const isShipment = order?.deliveryType === "SHIPMENT";
  const isDirect = order?.deliveryType === "DIRECT";

  const isSeller = useMemo(() => {
    if (!profile || !auction || auction.sellerId == null) return false;
    return profile.userId === auction.sellerId;
  }, [profile, auction]);
  const isBuyer = Boolean(profile && auction && !isSeller);

  const { data: shipment, isLoading: shipmentLoading } = useQuery({
    queryKey: ["shipment", effectiveOrderId],
    queryFn: () => orderApi.getShipment(effectiveOrderId as number),
    enabled: effectiveOrderId != null && isShipment,
    retry: false,
  });

  const [trackingData, setTrackingData] = useState<Awaited<
    ReturnType<typeof orderApi.getShipmentTracking>
  > | null>(null);
  const hasTrackingInfo = Boolean(shipment?.carrierCode && shipment?.trackingNumber);
  const isDeliveryCompleted =
    shipment?.status === "DELIVERED" ||
    shipment?.status === "COMPLETE" ||
    trackingData?.delivered === true;

  const updateAddressField = useCallback(
    (field: keyof SaveAddressReq, value: string) => {
      setAddressForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const ensureShipmentExists = useCallback(async () => {
    const orderId = effectiveOrderId as number;
    const existingShipment = await orderApi.getShipment(orderId);
    if (!existingShipment) {
      await orderApi.requestShipment(orderId);
    }
    return orderId;
  }, [effectiveOrderId]);

  const chooseDeliveryType = useMutation({
    mutationFn: (type: "DIRECT" | "SHIPMENT") =>
      orderApi.chooseDeliveryType(effectiveOrderId as number, type),
    onSuccess: (res) => {
      addToast("거래 방식이 저장되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["order", "by-auction", auctionId] });
      if (res.deliveryType === "DIRECT" && res.roomId != null) {
        navigate(`/chat?roomId=${res.roomId}`);
      }
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const saveAddress = useMutation({
    mutationFn: async () => {
      const orderId = await ensureShipmentExists();
      return orderApi.saveShipmentAddress(orderId, addressForm);
    },
    onSuccess: () => {
      addToast("배송지가 저장되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["shipment", effectiveOrderId] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const registerTracking = useMutation({
    mutationFn: async () => {
      const orderId = await ensureShipmentExists();
      return orderApi.registerTracking(orderId, { carrierCode, trackingNumber });
    },
    onSuccess: () => {
      addToast("송장 정보가 저장되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["shipment", effectiveOrderId] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const loadTracking = useMutation({
    mutationFn: () => orderApi.getShipmentTracking(effectiveOrderId as number),
    onSuccess: (res) => {
      setTrackingData(res);
      if (!res) addToast("실시간 배송 추적 정보가 없습니다.", "info");
      queryClient.invalidateQueries({ queryKey: ["shipment", effectiveOrderId] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const confirmShipment = useMutation({
    mutationFn: () => orderApi.confirmShipment(effectiveOrderId as number),
    onSuccess: () => {
      addToast("구매확정이 완료되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["shipment", effectiveOrderId] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const confirmDirect = useMutation({
    mutationFn: () => orderApi.confirmDirect(effectiveOrderId as number),
    onSuccess: () => addToast("직거래 구매확정이 완료되었습니다.", "success"),
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  if (auctionId == null) {
    return (
      <main className="max-w-[900px] mx-auto px-6 py-8">
        <div className="rounded-xl border border-border bg-white p-6">
          <h1 className="text-2xl font-bold text-text-main mb-2">배송 정보</h1>
          <p className="text-text-muted text-sm">
            잘못된 접근입니다. 경매 결과 페이지에서 배송 정보 버튼으로 다시 진입해 주세요.
          </p>
          <Link to="/" className="inline-block mt-4 text-primary font-semibold hover:underline">
            홈으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">배송/거래 진행</h1>
        <p className="text-sm text-text-muted mt-1">
          경매 #{auctionId}의 거래 방식, 배송지, 송장, 구매확정을 관리합니다.
        </p>
      </div>

      {orderLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !order || effectiveOrderId == null ? (
        <div className="rounded-xl border border-border bg-white p-6 text-sm text-text-muted">
          주문 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.
        </div>
      ) : (
        <>
          {order.deliveryType == null && (
            <section className="rounded-xl border border-border bg-white p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-main">거래 방식 선택</h2>
              {!isBuyer ? (
                <p className="text-sm text-text-muted">구매자가 거래 방식을 선택할 때까지 대기해 주세요.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => chooseDeliveryType.mutate("DIRECT")}
                    loading={chooseDeliveryType.isPending && chooseDeliveryType.variables === "DIRECT"}
                  >
                    직거래
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => chooseDeliveryType.mutate("SHIPMENT")}
                    loading={chooseDeliveryType.isPending && chooseDeliveryType.variables === "SHIPMENT"}
                  >
                    택배배송
                  </Button>
                </div>
              )}
            </section>
          )}

          {isDirect && (
            <section className="rounded-xl border border-border bg-white p-6 space-y-4">
              <h2 className="text-lg font-bold text-text-main">직거래 진행</h2>
              <p className="text-sm text-text-muted">채팅에서 거래 일정을 조율한 후 구매확정을 진행해 주세요.</p>
              <div className="flex flex-wrap gap-2">
                {order.roomId != null && (
                  <Button onClick={() => navigate(`/chat?roomId=${order.roomId}`)}>
                    채팅으로 이동
                  </Button>
                )}
                {isBuyer && (
                  <Button
                    variant="outline"
                    onClick={() => confirmDirect.mutate()}
                    loading={confirmDirect.isPending}
                  >
                    직거래 구매확정
                  </Button>
                )}
              </div>
            </section>
          )}

          {isShipment && (
            <section className="rounded-xl border border-border bg-white p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-text-main">택배 배송</h2>
                <p className="text-sm text-text-muted mt-1">
                  배송 상태: {shipmentLoading ? "조회 중..." : shipment?.status ?? "배송 정보 없음"}
                </p>
              </div>

              {isBuyer && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-main">배송지 입력</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={addressForm.recipientName}
                      onChange={(e) => updateAddressField("recipientName", e.target.value)}
                      placeholder="수령인"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <input
                      value={addressForm.recipientPhone}
                      onChange={(e) => updateAddressField("recipientPhone", e.target.value)}
                      placeholder="연락처"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <input
                      value={addressForm.zipCode}
                      onChange={(e) => updateAddressField("zipCode", e.target.value)}
                      placeholder="우편번호"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <input
                      value={addressForm.address1}
                      onChange={(e) => updateAddressField("address1", e.target.value)}
                      placeholder="기본 주소"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <input
                      value={addressForm.address2}
                      onChange={(e) => updateAddressField("address2", e.target.value)}
                      placeholder="상세 주소"
                      className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"
                    />
                    <input
                      value={addressForm.deliveryMemo}
                      onChange={(e) => updateAddressField("deliveryMemo", e.target.value)}
                      placeholder="배송 메모"
                      className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!addressForm.recipientName.trim() || !addressForm.address1.trim()) {
                        addToast("수령인과 기본 주소를 입력해 주세요.", "info");
                        return;
                      }
                      saveAddress.mutate();
                    }}
                    loading={saveAddress.isPending}
                  >
                    배송지 저장
                  </Button>
                </div>
              )}

              {isSeller && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-main">송장 등록</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={carrierCode}
                      onChange={(e) => setCarrierCode(e.target.value)}
                      placeholder="택배사 코드 (예: 04)"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="송장번호"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!carrierCode.trim() || !trackingNumber.trim()) {
                        addToast("택배사 코드와 송장번호를 입력해 주세요.", "info");
                        return;
                      }
                      registerTracking.mutate();
                    }}
                    loading={registerTracking.isPending}
                  >
                    송장 저장
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!hasTrackingInfo) {
                        addToast("송장 등록 후 실시간 배송 추적이 가능합니다.", "info");
                        return;
                      }
                      loadTracking.mutate();
                    }}
                    loading={loadTracking.isPending}
                    disabled={!hasTrackingInfo}
                  >
                    실시간 배송 추적 조회
                  </Button>
                  {isBuyer && (
                    <Button
                      onClick={() => {
                        if (!isDeliveryCompleted) {
                          addToast("배송완료(complete) 상태에서만 구매확정할 수 있습니다.", "info");
                          return;
                        }
                        confirmShipment.mutate();
                      }}
                      loading={confirmShipment.isPending}
                      disabled={!isDeliveryCompleted}
                    >
                      택배 구매확정
                    </Button>
                  )}
                </div>
                {isBuyer && !isDeliveryCompleted && (
                  <p className="text-xs text-text-muted">
                    배송 상태가 완료(DELIVERED/COMPLETE)로 변경되면 구매확정 버튼이 활성화됩니다.
                  </p>
                )}
                {trackingData && (
                  <div className="rounded-lg border border-border bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-text-main">
                      현재 상태: {trackingData.currentStatus}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      운송장: {trackingData.carrierCode} / {trackingData.trackingNumber}
                    </p>
                    {trackingData.events?.length > 0 && (
                      <ul className="mt-3 space-y-2 text-xs text-text-main">
                        {trackingData.events.slice(0, 5).map((event, idx) => (
                          <li key={`${event.timeString}-${idx}`} className="border-t border-border pt-2">
                            [{event.timeString}] {event.where} - {event.kind}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
