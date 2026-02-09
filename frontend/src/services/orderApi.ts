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
  getByAuction: async (auctionId: number): Promise<OrderByAuctionRes | null> => {
    try {
      const response = await api.get<OrderByAuctionRes>(`/api/orders/by-auction/${auctionId}`, {
        validateStatus: (status) => status === 200 || status === 404, // 404를 정상 응답으로 처리
      });
      // 404면 null 반환, 200이면 데이터 반환
      if (response.status === 404) {
        return null;
      }
      return response.data;
    } catch (error: any) {
      // 예상치 못한 에러만 throw
      throw error;
    }
  },

  /** 거래 방식 선택 (구매자만) */
  chooseDeliveryType: (orderId: number, type: "DIRECT" | "SHIPMENT") =>
    api
      .patch<ChooseDeliveryTypeRes>(
        `/api/orders/${orderId}/delivery-type`,
        { type }
      )
      .then((r) => r.data),
};
