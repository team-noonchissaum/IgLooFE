import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wishApi } from "@/services/wishApi";
import { formatKrw } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToastStore } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/api";
import { MeSidebar } from "@/components/layout/MeSidebar";
import type { WishItemRes } from "@/lib/types";

export function MeWishesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);

  const { data: wishes, isLoading } = useQuery({
    queryKey: ["wish"],
    queryFn: () => wishApi.list(),
  });

  const wishToggle = useMutation({
    mutationFn: (itemId: number) => wishApi.toggle(itemId),
    onSuccess: (data) => {
      addToast(data.wished ? "찜 목록에 추가되었습니다." : "찜이 해제되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["wish"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const list = wishes ?? [];

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <MeSidebar />
        <section className="flex-1">
          <h1 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary fill-icon">
              favorite
            </span>
            찜 목록
          </h1>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-text-muted mb-4">
            favorite
          </span>
          <p className="text-text-muted font-medium">찜한 경매가 없습니다.</p>
          <Link
            to="/"
            className="inline-block mt-4 text-primary font-semibold hover:underline"
          >
            경매 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => (
            <WishCard
              key={item.itemId}
              item={item}
              onToggle={() => wishToggle.mutate(item.itemId)}
              isToggling={wishToggle.isPending}
            />
          ))}
        </div>
      )}
        </section>
      </div>
    </main>
  );
}

function WishCard({
  item,
  onToggle,
  isToggling,
}: {
  item: WishItemRes;
  onToggle: () => void;
  isToggling: boolean;
}) {
  const linkTo = item.auctionId != null ? `/auctions/${item.auctionId}` : "#";

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {linkTo !== "#" ? (
        <Link to={linkTo} className="block relative aspect-[4/3] overflow-hidden bg-[#f8f9fa]">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <span className="material-symbols-outlined text-5xl">image</span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
            disabled={isToggling}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-primary hover:bg-white transition-colors"
            aria-label="찜 해제"
          >
            <span className="material-symbols-outlined fill-icon text-xl">
              favorite
            </span>
          </button>
        </Link>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f8f9fa]">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <span className="material-symbols-outlined text-5xl">image</span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={isToggling}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-primary"
            aria-label="찜 해제"
          >
            <span className="material-symbols-outlined fill-icon text-xl">
              favorite
            </span>
          </button>
        </div>
      )}
      <div className="p-4">
        {linkTo !== "#" ? (
          <Link to={linkTo}>
            <h3 className="font-bold text-text-main line-clamp-1 hover:text-primary transition-colors">
              {item.title}
            </h3>
          </Link>
        ) : (
          <h3 className="font-bold text-text-main line-clamp-1">{item.title}</h3>
        )}
        <p className="text-sm text-text-muted mt-1">
          {item.sellerName} · {formatKrw(item.startPrice)}
        </p>
        <p className="text-xs text-text-muted mt-0.5">찜 {item.wishCount}명</p>
      </div>
    </div>
  );
}
