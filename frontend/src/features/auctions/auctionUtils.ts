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

export function minNextBid(current: number, startPrice: number): number {
  const increment = startPrice > 0 ? Math.ceil(startPrice * 0.1) : 100;
  return current + increment;
}

// First bid: start price as-is (including 0).
// Next bids: current price + (10% of start price), +100 when start price is 0.
export function getMinBid(
  currentPrice: number,
  startPrice: number,
  bidCount: number
): number {
  const normalizedStartPrice = startPrice > 0 ? startPrice : 0;

  if (bidCount === 0) {
    return startPrice;
  }

  return minNextBid(currentPrice, normalizedStartPrice);
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
