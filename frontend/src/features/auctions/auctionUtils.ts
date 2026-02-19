import type { AuctionStatus } from "@/lib/types";

export const CLOSED_AUCTION_STATUSES: AuctionStatus[] = [
  "ENDED",
  "SUCCESS",
  "FAILED",
  "CANCELED",
];

export const NON_LISTED_AUCTION_STATUSES: AuctionStatus[] = [
  ...CLOSED_AUCTION_STATUSES,
  "READY",
];

export function minNextBid(current: number): number {
  const next = Math.ceil((current * 1.1) / 10) * 10;
  return next > current ? next : current + 10;
}

/** 최소 입찰가: 최초 입찰(입찰 수 0)이면 등록가, 그 외에는 현재가 기준 10% 상승 */
export function getMinBid(
  currentPrice: number,
  startPrice: number,
  bidCount: number
): number {
  if (bidCount === 0) return startPrice;
  return minNextBid(currentPrice);
}

export function formatWonNumber(amount: number): string {
  return Number.isFinite(amount) ? amount.toLocaleString("ko-KR") : "0";
}

export function isAuctionClosed(status?: string): boolean {
  if (!status) return false;
  return (CLOSED_AUCTION_STATUSES as string[]).includes(status);
}

export function isValidAuctionId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

export function isAuctionBiddable(status?: string): boolean {
  return status === "RUNNING" || status === "DEADLINE";
}
