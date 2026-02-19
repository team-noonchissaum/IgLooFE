export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface Auction {
  auctionId: number;
  title: string;
  description: string;
  currentPrice: number;
  startPrice: number;
  bidCount: number;
  status: 'WAITING' | 'READY' | 'RUNNING' | 'ENDED' | 'CANCELED';
  startAt: string;
  endAt: string;
  sellerNickname: string;
  imageUrls: string[];
  categoryId: number;
  categoryName: string;
}

export interface AuctionRegisterRequest {
  title: string;
  description: string;
  startPrice: number;
  categoryId: number;
  startAt: string;
  endAt: string;
  imageUrls: string[];
}
