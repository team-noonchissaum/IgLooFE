import { api, unwrapData } from "@/lib/api";
import type {
  PlaceBidReq,
  PageResponse,
  BidHistoryItemRes,
  MyBidAuctionRes,
} from "@/lib/types";

export const bidApi = {
  /** 입찰 내역 - GET /api/bid/{auctionId} (Page) */
  list: (auctionId: number, params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<BidHistoryItemRes> }>(
        `/api/bid/${auctionId}`,
        { params: { page: params?.page ?? 0, size: params?.size ?? 20 } },
      )
      .then(unwrapData),

  /** 내 입찰 목록 - GET /api/bid/my (Page) */
  myBids: (params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<MyBidAuctionRes> }>(
        "/api/bid/my",
        { params: { page: params?.page ?? 0, size: params?.size ?? 20 } },
      )
      .then(unwrapData),

  /** 입찰하기 - POST /api/bid (PlaceBidReq: auctionId, bidAmount, requestId) */
  place: (body: PlaceBidReq) =>
    api.post<{ message: string; data: null }>("/api/bid", body),
};
