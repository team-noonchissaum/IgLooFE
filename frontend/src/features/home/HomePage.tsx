import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/services/auctionApi";
import { formatKrw } from "@/lib/format";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { AuctionListRes } from "@/lib/types";

type SortType =
  | "LATEST"
  | "BID_COUNT"
  | "DEADLINE"
  | "PRICE_HIGH"
  | "PRICE_LOW";

const sortLabels: Record<SortType, string> = {
  LATEST: "최신순",
  BID_COUNT: "입찰수",
  DEADLINE: "마감임박",
  PRICE_HIGH: "가격 높은순",
  PRICE_LOW: "가격 낮은순",
};

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get("categoryId");
  const [categoryId, setCategoryIdState] = useState<number | undefined>(() =>
    categoryIdFromUrl ? Number(categoryIdFromUrl) : undefined
  );
  useEffect(() => {
    const id = categoryIdFromUrl ? Number(categoryIdFromUrl) : undefined;
    setCategoryIdState(Number.isNaN(id) ? undefined : id);
  }, [categoryIdFromUrl]);

  const setCategoryId = (id: number | undefined) => {
    setCategoryIdState(id);
    const next = new URLSearchParams(searchParams);
    if (id == null) next.delete("categoryId");
    else next.set("categoryId", String(id));
    setSearchParams(next, { replace: true });
  };

  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<SortType>("LATEST");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");

  const { data: searchData, isLoading } = useQuery({
    queryKey: [
      "auctions",
      "search",
      keyword || undefined,
      categoryId,
      sort,
      page,
    ],
    queryFn: () =>
      auctionApi.search({
        keyword: keyword || undefined,
        categoryId,
        sort,
        page,
        size: 12,
      }),
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(0);
  };

  const auctions = searchData?.content ?? [];
  const hasMore = searchData != null && !searchData.last;

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-8">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-main">
              진행 중인 경매
            </h2>
            <Link
              to="/auctions/new"
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover flex items-center gap-2 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">
                add_circle
              </span>
              경매 등록
            </Link>
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 flex-wrap"
            >
              <input
                type="text"
                placeholder="검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="rounded-xl border border-border px-4 py-2 text-sm w-48 focus:ring-2 focus:ring-primary focus:border-primary"
                aria-label="검색어"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover"
              >
                검색
              </button>
            </form>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">정렬:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
                className="text-sm font-bold text-primary border-0 bg-transparent cursor-pointer focus:ring-0"
                aria-label="정렬"
              >
                {(Object.keys(sortLabels) as SortType[]).map((s) => (
                  <option key={s} value={s}>
                    {sortLabels[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : auctions.map((auction) => (
                <AuctionCard key={auction.auctionId} auction={auction} />
              ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-12 mb-8">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-10 py-3.5 rounded-2xl border-2 border-border text-[#495057] font-bold text-[15px] hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all"
            >
              더 보기
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function AuctionCard({ auction }: { auction: AuctionListRes }) {
  const img = auction.thumbnailUrl ?? undefined;
  const isLive = auction.status === "RUNNING" || auction.status === "DEADLINE";
  const endAtMs = auction.endAt
    ? new Date(auction.endAt).getTime() - Date.now()
    : 0;
  const [remaining, setRemaining] = useState(
    endAtMs > 0 ? Math.floor(endAtMs / 1000) : 0
  );
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(
      () => setRemaining((r) => (r <= 0 ? 0 : r - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [remaining]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;

  return (
    <Link
      to={`/auctions/${auction.auctionId}`}
      className="group flex flex-col bg-white rounded-2xl border border-border overflow-hidden sky-shadow-hover transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f8f9fa]">
        {img ? (
          <img
            src={img}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-5xl">image</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm border ${
              isLive
                ? "bg-white/95 border-primary-light"
                : "bg-white/95 border-border"
            }`}
          >
            {isLive && <span className="live-dot-blue" />}
            <span
              className={`text-[11px] font-extrabold tracking-tight uppercase ${
                isLive ? "text-primary" : "text-[#495057]"
              }`}
            >
              {remaining > 0 ? timeStr : "종료"}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <h3 className="font-bold text-[16px] text-text-main line-clamp-1 group-hover:text-primary transition-colors">
          {auction.title}
        </h3>
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider leading-none mb-1">
              현재가
            </span>
            <span className="text-[20px] font-extrabold text-text-main">
              {formatKrw(auction.currentPrice)}
            </span>
          </div>
          {(auction.bidCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-primary text-[13px] font-bold">
              <span className="material-symbols-outlined text-[18px]">
                gavel
              </span>
              {auction.bidCount}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
