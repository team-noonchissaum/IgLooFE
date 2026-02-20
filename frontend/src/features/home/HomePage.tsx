import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { auctionApi } from "@/services/auctionApi";
import { wishApi } from "@/services/wishApi";
import { categoryApi } from "@/services/categoryApi";
import { locationApi } from "@/services/locationApi";
import { getApiErrorMessage } from "@/lib/api";
import { formatKrw } from "@/lib/format";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { CategorySidebar } from "@/components/layout/CategoryBar";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import type { AuctionListRes, AuctionRes, Category } from "@/lib/types";
import { NON_LISTED_AUCTION_STATUSES } from "@/features/auctions/auctionUtils";

type SortType =
  | "LATEST"
  | "BID_COUNT"
  | "DEADLINE"
  | "PRICE_HIGH"
  | "PRICE_LOW";

type RadiusKm = 1 | 3 | 7 | 10 | 20 | 50;

const sortLabels: Record<SortType, string> = {
  LATEST: "최신순",
  BID_COUNT: "입찰수",
  DEADLINE: "마감임박",
  PRICE_HIGH: "가격 높은순",
  PRICE_LOW: "가격 낮은순",
};

const radiusOptions: RadiusKm[] = [1, 3, 7, 10, 20, 50];
const CLIENT_PAGE_SIZE = 12;
const SEARCH_FETCH_SIZE = 100;
const SEARCH_FETCH_MAX_PAGES = 30;

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

function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}일 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
}

function sortAuctionsByType(items: AuctionListRes[], sort: SortType): AuctionListRes[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "LATEST":
        // 목록 DTO에 생성시각이 없어 id를 최신순의 대리 지표로 사용
        return b.auctionId - a.auctionId;
      case "BID_COUNT":
        return (b.bidCount ?? 0) - (a.bidCount ?? 0) || b.auctionId - a.auctionId;
      case "DEADLINE":
        return (
          (new Date(a.endAt).getTime() || Number.MAX_SAFE_INTEGER) -
            (new Date(b.endAt).getTime() || Number.MAX_SAFE_INTEGER) ||
          b.auctionId - a.auctionId
        );
      case "PRICE_HIGH":
        return b.currentPrice - a.currentPrice || b.auctionId - a.auctionId;
      case "PRICE_LOW":
        return a.currentPrice - b.currentPrice || b.auctionId - a.auctionId;
      default:
        return 0;
    }
  });
}

function paginateAuctions(items: AuctionListRes[], page: number) {
  const startIndex = page * CLIENT_PAGE_SIZE;
  const endIndex = startIndex + CLIENT_PAGE_SIZE;
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / CLIENT_PAGE_SIZE);

  return {
    content: items.slice(startIndex, endIndex),
    totalElements,
    totalPages,
    size: CLIENT_PAGE_SIZE,
    number: page,
    first: page === 0,
    last: endIndex >= totalElements,
  };
}

/** 카테고리 트리에서 선택된 카테고리와 모든 하위 카테고리 ID를 수집 */
function getCategoryIdsIncludingChildren(
  categories: Category[],
  categoryId: number
): number[] {
  const result: number[] = [categoryId];
  
  const collectChildren = (id: number) => {
    categories.forEach((cat) => {
      if (cat.parentId === id) {
        result.push(cat.id);
        collectChildren(cat.id);
      }
    });
  };
  
  collectChildren(categoryId);
  return result;
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const addToast = useToastStore((s) => s.add);

  const keywordFromUrl = searchParams.get("keyword") ?? "";
  const sortFromUrl = searchParams.get("sort");
  const pageFromUrl = Number(searchParams.get("page") ?? "0");
  const normalizedSort: SortType =
    sortFromUrl && (Object.keys(sortLabels) as SortType[]).includes(sortFromUrl as SortType)
      ? (sortFromUrl as SortType)
      : "LATEST";
  const normalizedPage =
    Number.isFinite(pageFromUrl) && pageFromUrl >= 0 ? Math.floor(pageFromUrl) : 0;

  const categoryIdFromUrl = searchParams.get("categoryId");
  const categoryId = useMemo(() => {
    if (!categoryIdFromUrl) return undefined;
    const parsed = Number(categoryIdFromUrl);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [categoryIdFromUrl]);
  const resetFlag = searchParams.get("reset") === "1";
  useEffect(() => {
    if (!resetFlag) return;
    setKeyword("");
    setSearchInput("");
    setPage(0);
    setSort("LATEST");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("reset");
        next.delete("categoryId");
        next.delete("keyword");
        next.delete("sort");
        next.delete("page");
        return next;
      },
      { replace: true }
    );
  }, [resetFlag, setSearchParams]);

  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [sort, setSort] = useState<SortType>(normalizedSort);
  const [page, setPage] = useState(normalizedPage);
  const [searchInput, setSearchInput] = useState(keywordFromUrl);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(7);

  useEffect(() => {
    setKeyword(keywordFromUrl);
    setSearchInput(keywordFromUrl);
    setSort(normalizedSort);
    setPage(normalizedPage);
  }, [keywordFromUrl, normalizedSort, normalizedPage]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (keyword.trim()) next.set("keyword", keyword.trim());
        else next.delete("keyword");

        if (sort !== "LATEST") next.set("sort", sort);
        else next.delete("sort");

        if (page > 0) next.set("page", String(page));
        else next.delete("page");

        return next;
      },
      { replace: true }
    );
  }, [keyword, sort, page, setSearchParams]);

  // 카테고리 목록 가져오기
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    retry: false,
  });

  const { data: myLocation, isLoading: isLocationLoading } = useQuery({
    queryKey: ["users", "location"],
    queryFn: () => locationApi.getMyLocation(),
    enabled: isAuth,
    retry: false,
  });
  const hasSavedLocation = Boolean(myLocation?.address?.trim());

  const { data: hotDeals = [] } = useQuery({
    queryKey: ["auctions", "hotDeals"],
    queryFn: () => auctionApi.getHotDeals(),
    retry: false,
    refetchInterval: 30_000,
  });
  const hotDealBannerItems = useMemo(
    () =>
      hotDeals.slice(0, 5).map((deal) => ({
        auction: toAuctionListRes(deal),
        startAt: deal.startAt,
      })),
    [hotDeals],
  );
  const [hotDealNowMs, setHotDealNowMs] = useState(Date.now());
  useEffect(() => {
    if (hotDealBannerItems.length === 0) return;
    const timer = window.setInterval(() => {
      setHotDealNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hotDealBannerItems.length]);

  // 대분류 선택 시 하위 카테고리까지 포함한 ID 리스트
  const categoryIdsToSearch = useMemo(() => {
    if (categoryId == null) return undefined;
    
    // 선택된 카테고리가 대분류인지 확인 (parentId가 null)
    const selectedCategory = categories.find((c) => c.id === categoryId);
    if (selectedCategory?.parentId == null) {
      // 대분류인 경우 하위 카테고리까지 포함
      return getCategoryIdsIncludingChildren(categories, categoryId);
    }
    // 소분류인 경우 해당 카테고리만
    return [categoryId];
  }, [categoryId, categories]);

  const fetchAllSearchPages = async (params: {
    keyword?: string;
    categoryId?: number;
    sort: SortType;
  }) => {
    const merged: AuctionListRes[] = [];
    for (let pageIndex = 0; pageIndex < SEARCH_FETCH_MAX_PAGES; pageIndex++) {
      const pageResult = await auctionApi.search({
        keyword: params.keyword,
        categoryId: params.categoryId,
        sort: params.sort,
        page: pageIndex,
        size: SEARCH_FETCH_SIZE,
      });
      if (pageResult?.content?.length) {
        merged.push(...pageResult.content);
      }
      if (!pageResult || pageResult.last || (pageResult.content?.length ?? 0) === 0) {
        break;
      }
    }
    return merged;
  };

  const { data: searchData, isLoading } = useQuery({
    queryKey: [
      "auctions",
      isNearbyMode ? "nearby" : "search",
      keyword || undefined,
      categoryIdsToSearch?.join(","),
      sort,
      page,
      radiusKm,
    ],
    queryFn: async () => {
      if (isNearbyMode) {
        return locationApi.nearbyAuctions({
          radiusKm,
          page,
          size: 12,
        });
      }

      // 가격 정렬 시 백엔드 Redis 정렬은 단일 카테고리만 지원하므로
      // 프론트엔드에서 모든 결과를 받아서 정렬하도록 처리
      const isPriceSort = sort === "PRICE_HIGH" || sort === "PRICE_LOW";

      const targetCategoryIds = categoryIdsToSearch && categoryIdsToSearch.length > 0
        ? categoryIdsToSearch
        : [undefined];

      // 카테고리별 전체 페이지를 수집한 뒤 합쳐서 정렬/페이징
      const queries = targetCategoryIds.map((catId) =>
        fetchAllSearchPages({
          keyword: isPriceSort ? undefined : (keyword || undefined),
          categoryId: catId,
          sort: isPriceSort ? "LATEST" : sort,
        })
      );
      
      const results = await Promise.all(queries);
      
      // 결과 합치기
      const allAuctions: AuctionListRes[] = [];
      results.forEach((result) => {
        if (result?.length) {
          allAuctions.push(...result);
        }
      });

      // 중복 제거 (auctionId 기준)
      const uniqueAuctions = Array.from(
        new Map(allAuctions.map((a) => [a.auctionId, a])).values()
      );

      // 상태 필터링 (ENDED, SUCCESS, FAILED, CANCELED, READY 제외)
      const excludedStatuses = NON_LISTED_AUCTION_STATUSES;
      let filteredAuctions = uniqueAuctions.filter(
        (a) => !excludedStatuses.includes(a.status)
      );

      // keyword 필터링 (가격 정렬 시에는 백엔드 keyword를 사용하지 않으므로 프론트에서 처리)
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filteredAuctions = filteredAuctions.filter((a) =>
          a.title.toLowerCase().includes(lowerKeyword)
        );
      }

      const sortedAuctions = sortAuctionsByType(filteredAuctions, sort);
      return paginateAuctions(sortedAuctions, page);
    },
    retry: false,
  });

  const excludedStatuses = NON_LISTED_AUCTION_STATUSES;
  const auctions = (searchData?.content ?? []).filter(
    (a) => !excludedStatuses.includes(a.status)
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setKeyword("");
    setSearchInput("");
    setPage(0);
    setSort("LATEST");
    setIsNearbyMode(false);
    setRadiusKm(7);
    setSearchParams({}, { replace: true });
  };

  const handleNearbyMode = () => {
    if (!isAuth) {
      addToast("내 주변 경매는 로그인 후 이용할 수 있습니다.", "info");
      navigate("/login?redirect=/");
      return;
    }
    if (isLocationLoading) {
      addToast("저장된 위치 정보를 확인 중입니다. 잠시 후 다시 시도해 주세요.", "info");
      return;
    }
    if (!hasSavedLocation) {
      addToast("내 주변 경매를 위해 먼저 내정보에서 위치를 저장해 주세요.", "info");
      navigate("/me/edit");
      return;
    }
    setIsNearbyMode(true);
    setPage(0);
  };

  const handleAllMode = () => {
    setIsNearbyMode(false);
    setPage(0);
  };

  const totalPages = Math.max(0, searchData?.totalPages ?? 0);

  return (
    <div className="flex max-w-[1200px] mx-auto">
      <CategorySidebar />
      <main className="flex-1 px-6 py-8 relative">
        <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          {hotDealBannerItems.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {hotDealBannerItems.map(({ auction, startAt }) => {
                const remainingText = startAt
                  ? formatRemaining(new Date(startAt).getTime() - hotDealNowMs)
                  : null;
                return (
                  <Link
                    key={auction.auctionId}
                    to={`/auctions/${auction.auctionId}`}
                    className="group min-w-[220px] sm:min-w-[240px] rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-2.5 py-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-red-100 bg-white">
                        {auction.thumbnailUrl ? (
                          <img
                            src={auction.thumbnailUrl}
                            alt={auction.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-red-300">
                            <span className="material-symbols-outlined text-base">
                              image
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          HOT DEAL
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-text-main line-clamp-1 break-keep group-hover:text-primary transition-colors">
                          {auction.title}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1 break-keep">
                          현재가 {formatKrw(auction.currentPrice)}
                        </p>
                        {remainingText && (
                          <p className="text-[10px] font-semibold text-red-600 mt-0.5">
                            입찰 시작까지 {remainingText}
                          </p>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-red-500 text-base">
                        local_fire_department
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-main">
              진행 중인 경매
            </h2>
            {isAuth ? (
              <Link
                to="/auctions/new"
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover flex items-center gap-2 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-lg">
                  add_circle
                </span>
                경매 등록
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  addToast("경매 등록을 위해 로그인해 주세요.", "info");
                  navigate("/login?redirect=/auctions/new");
                }}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover flex items-center gap-2 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-lg">
                  add_circle
                </span>
                경매 등록
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAllMode}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                !isNearbyMode
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-main border-border hover:bg-gray-50"
              }`}
            >
              전체 경매
            </button>
            <button
              type="button"
              onClick={handleNearbyMode}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                isNearbyMode
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-main border-border hover:bg-gray-50"
              }`}
            >
              내 주변 경매
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 flex-1 min-w-[300px]"
            >
              <input
                type="text"
                placeholder="검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 rounded-xl border border-border px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-[var(--surface)] text-text-main"
                aria-label="검색어"
                disabled={isNearbyMode}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
                disabled={isNearbyMode}
              >
                검색
              </button>
              {(keyword || categoryId != null || isNearbyMode) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-text-main hover:bg-gray-50 transition-colors"
                >
                  홈
                </button>
              )}
            </form>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">정렬:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortType);
                  setPage(0);
                }}
                className="text-sm font-bold text-primary border-0 bg-transparent cursor-pointer focus:ring-0 dark:text-primary"
                aria-label="정렬"
                disabled={isNearbyMode}
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

        {isNearbyMode && (
          <div className="rounded-2xl border border-border bg-white p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text-main">검색 반경:</span>
              {radiusOptions.map((radius) => (
                <button
                  key={radius}
                  type="button"
                  onClick={() => {
                    setRadiusKm(radius);
                    setPage(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    radiusKm === radius
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-text-main border-border hover:bg-gray-50"
                  }`}
                >
                  {radius}km
                </button>
              ))}
            </div>
            <p className="text-sm text-text-main">
              저장된 위치:
              <span className="ml-1 font-semibold">
                {myLocation?.address ?? "위치 미설정"}
              </span>
            </p>
            <p className="text-xs text-text-muted">
              위치 변경은 마이페이지 {">"} 내정보에서 할 수 있습니다.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : auctions.map((auction) => (
                <AuctionCard key={auction.auctionId} auction={auction} />
              ))}
        </div>

        {!isLoading && auctions.length === 0 && (
          <div className="py-12 text-center text-text-muted">
            <p className="font-medium">
              {isNearbyMode
                ? "주변에서 진행 중인 경매가 없습니다."
                : keyword || categoryId != null
                ? "검색 결과가 없습니다."
                : "진행중인 경매가 없습니다."}
            </p>
            {(keyword || categoryId != null || isNearbyMode) && (
              <button
                type="button"
                onClick={handleReset}
                className="mt-3 text-primary font-semibold hover:underline"
              >
                전체 경매 보기
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 mb-8">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </Button>
            <span className="text-sm text-text-muted px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              다음
            </Button>
          </div>
        )}
        </section>
        <ChatbotWidget />
      </main>
    </div>
  );
}

function AuctionCard({ auction }: { auction: AuctionListRes }) {
  const queryClient = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const addToast = useToastStore((s) => s.add);
  const wishToggle = useMutation({
    mutationFn: (itemId: number) => wishApi.toggle(itemId),
    onSuccess: (data) => {
      addToast(data.wished ? "찜 목록에 추가되었습니다." : "찜이 해제되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["wish"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

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

  const handleWishClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuth) {
      addToast("찜하려면 로그인해 주세요.", "info");
      return;
    }
    wishToggle.mutate(auction.itemId);
  };

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
        {isAuth && (
          <button
            type="button"
            onClick={handleWishClick}
            disabled={wishToggle.isPending}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors z-10 ${
              auction.isWished
                ? "bg-red-500/90"
                : "bg-white/90 text-text-muted hover:bg-white"
            }`}
            aria-label={auction.isWished ? "찜 해제" : "찜하기"}
          >
            <span
              className={`material-symbols-outlined text-xl ${
                auction.isWished
                  ? "fill-icon text-white"
                  : "text-text-muted"
              }`}
            >
              favorite
            </span>
          </button>
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
              {auction.status === "DEADLINE"
                ? "마감임박!"
                : remaining > 0
                ? timeStr
                : "종료"}
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
          <div className="flex items-center gap-2">
            {(auction.bidCount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-primary text-[13px] font-bold">
                <span className="material-symbols-outlined text-[18px]">
                  gavel
                </span>
                {auction.bidCount}
              </div>
            )}
            {(auction.wishCount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-red-500 text-[13px] font-bold">
                <span className="material-symbols-outlined text-[18px] fill-icon">
                  favorite
                </span>
                {auction.wishCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
