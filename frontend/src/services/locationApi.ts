import { api, unwrapData } from "@/lib/api";
import type {
  AuctionListRes,
  AuctionRes,
  PageResponse,
  UserLocationRes,
} from "@/lib/types";

type RadiusKm = 1 | 3 | 7 | 10 | 20 | 50;

function toAuctionListRes(auction: AuctionRes): AuctionListRes {
  return {
    auctionId: auction.auctionId,
    itemId: auction.itemId ?? 0,
    title: auction.title,
    currentPrice: auction.currentPrice,
    startPrice: auction.startPrice,
    bidCount: auction.bidCount ?? 0,
    status: auction.status,
    endAt: auction.endAt,
    sellerNickname: auction.sellerNickname,
    thumbnailUrl: auction.imageUrls?.[0] ?? null,
    categoryId: auction.categoryId,
    categoryName: auction.categoryName,
    wishCount: auction.wishCount ?? 0,
    isWished: auction.isWished ?? false,
  };
}

export const locationApi = {
  getMyLocation: () =>
    api
      .get<{ message: string; data: UserLocationRes }>("/api/users/location")
      .then(unwrapData),

  updateMyLocation: (address: string) =>
    api
      .put<{ message: string; data: UserLocationRes }>("/api/users/location", {
        address,
      })
      .then(unwrapData),

  nearbyAuctions: (params: { radiusKm: RadiusKm; page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<AuctionRes> }>(
        "/api/location/auctions/nearby",
        {
          params: {
            radiusKm: params.radiusKm,
            page: params.page ?? 0,
            size: params.size ?? 12,
          },
        }
      )
      .then(unwrapData)
      .then((pageData) => ({
        ...pageData,
        content: (pageData.content ?? []).map(toAuctionListRes),
      })),
};
