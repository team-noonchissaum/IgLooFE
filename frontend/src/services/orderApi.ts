import { api, unwrapData } from "@/lib/api";

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

export interface SaveAddressReq {
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address1: string;
  address2: string;
  deliveryMemo: string;
}

export interface RegisterTrackingReq {
  carrierCode: string;
  trackingNumber: string;
}

export interface ShipmentRes {
  shipmentId: number;
  orderId: number;
  recipientName: string | null;
  recipientPhone: string | null;
  zipCode: string | null;
  address1: string | null;
  address2: string | null;
  deliveryMemo: string | null;
  carrierCode: string | null;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface ShipmentTrackingEvent {
  timeString: string;
  where: string;
  kind: string;
  telno: string;
}

export interface ShipmentTrackingRes {
  carrierCode: string;
  trackingNumber: string;
  delivered: boolean;
  currentStatus: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  events: ShipmentTrackingEvent[];
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
      .patch<{ message: string; data: ChooseDeliveryTypeRes }>(
        `/api/orders/${orderId}/delivery-type`,
        { type }
      )
      .then(unwrapData),

  requestShipment: (orderId: number) =>
    api
      .post<{ message: string; data: ShipmentRes }>(`/api/orders/${orderId}/shipment`)
      .then(unwrapData),

  saveShipmentAddress: (orderId: number, body: SaveAddressReq) =>
    api
      .post<{ message: string; data: ShipmentRes }>(
        `/api/orders/${orderId}/shipment/address`,
        body
      )
      .then(unwrapData),

  registerTracking: (orderId: number, body: RegisterTrackingReq) =>
    api
      .patch<{ message: string; data: ShipmentRes }>(
        `/api/orders/${orderId}/shipment/tracking`,
        body
      )
      .then(unwrapData),

  getShipment: async (orderId: number): Promise<ShipmentRes | null> => {
    const response = await api.get<{ message: string; data: ShipmentRes }>(
      `/api/orders/${orderId}/shipment`,
      {
        validateStatus: (status) => status === 200 || status === 404,
      }
    );
    if (response.status === 404) return null;
    return response.data?.data ?? null;
  },

  getShipmentTracking: async (orderId: number): Promise<ShipmentTrackingRes | null> => {
    const response = await api.get<{ message: string; data: ShipmentTrackingRes }>(
      `/api/orders/${orderId}/shipment/tracking`,
      {
        validateStatus: (status) => status === 200 || status === 404,
      }
    );
    if (response.status === 404) return null;
    return response.data?.data ?? null;
  },

  confirmShipment: (orderId: number) =>
    api.patch<{ message: string; data: null }>(`/api/orders/${orderId}/shipment/confirm`),

  confirmDirect: (orderId: number) =>
    api.patch<{ message: string; data: null }>(`/api/orders/${orderId}/direct/confirm`),
};
