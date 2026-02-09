import { api } from "@/lib/api";

export interface OrderByAuctionRes {
  orderId: number;
  deliveryType: "DIRECT" | "SHIPMENT" | null;
  roomId: number | null;
}

export interface ChooseDeliveryTypeRes {
  orderId: number;
  deliveryType: "DIRECT" | "SHIPMENT";
  roomId: number | null;
}

/** 주문 API */
export const orderApi = {
  /** 경매 기준 주문 조회 (구매자/판매자) */
  getByAuction: (auctionId: number) =>
    api
      .get<OrderByAuctionRes>(`/api/orders/by-auction/${auctionId}`)
      .then((r) => r.data),

  /** 거래 방식 선택 (구매자만) */
  chooseDeliveryType: (orderId: number, type: "DIRECT" | "SHIPMENT") =>
    api
      .patch<ChooseDeliveryTypeRes>(
        `/api/orders/${orderId}/delivery-type`,
        { type }
      )
      .then((r) => r.data),
};
