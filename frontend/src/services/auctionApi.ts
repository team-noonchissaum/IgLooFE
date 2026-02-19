import { api, unwrapData } from "@/lib/api";
import type {
  PageResponse,
  AuctionListRes,
  AuctionRes,
  AuctionRegisterReq,
} from "@/lib/types";

export const auctionApi = {
  /** 경매 목록 (페이징) - GET /api/auctions */
  list: (params?: { page?: number; size?: number; status?: string }) =>
    api
      .get<{ message: string; data: PageResponse<AuctionRes> }>(
        "/api/auctions",
        {
          params: {
            page: params?.page ?? 0,
            size: params?.size ?? 12,
            status: params?.status,
          },
        },
      )
      .then(unwrapData),

  /** 경매 검색 - GET /api/auctions/search */
  search: (params: {
    page?: number;
    size?: number;
    keyword?: string;
    categoryId?: number;
    status?: string;
    sort?: "LATEST" | "BID_COUNT" | "DEADLINE" | "PRICE_HIGH" | "PRICE_LOW";
  }) =>
    api
      .get<{ message: string; data: PageResponse<AuctionListRes> }>(
        "/api/auctions/search",
        {
          params: {
            page: params.page ?? 0,
            size: params.size ?? 12,
            keyword: params.keyword,
            categoryId: params.categoryId,
            status: params.status,
            sort: params.sort ?? "LATEST",
          },
        },
      )
      .then(unwrapData),

  /** 경매 상세 - GET /api/auctions/{auctionId} */
  getById: (auctionId: number) =>
    api
      .get<{ message: string; data: AuctionRes }>(`/api/auctions/${auctionId}`)
      .then(unwrapData),

  /** 경매 등록 - POST /api/auctions (AuctionRegisterReq: startPrice, auctionDuration, imageUrls) */
  create: (body: AuctionRegisterReq) =>
    api
      .post<{ message: string; data: number }>("/api/auctions", body)
      .then(unwrapData),

  /** 경매 취소 - DELETE /api/auctions/{auctionId} */
  cancel: (auctionId: number) =>
    api.delete<{ message: string; data: null }>(`/api/auctions/${auctionId}`),

  /** 메인 핫딜 배너 조회 - GET /api/auctions/hot-deals */
  getHotDeals: () =>
    api
      .get<{ message: string; data: AuctionRes[] }>("/api/auctions/hot-deals")
      .then(unwrapData),

  /** 관리자 핫딜 등록 - POST /api/admin/hot-deals */
  createHotDeal: (body: AuctionRegisterReq) =>
    api
      .post<{ message: string; data: number }>("/api/admin/hot-deals", body)
      .then(unwrapData),

  /** 관리자 핫딜 취소 - PATCH /api/admin/hot-deals/{auctionId}/cancel */
  cancelHotDeal: (auctionId: number) =>
    api.patch<{ message: string; data: null }>(
      `/api/admin/hot-deals/${auctionId}/cancel`,
    ),
};
