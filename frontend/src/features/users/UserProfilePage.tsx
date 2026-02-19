import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/userApi";
import { Skeleton } from "@/components/ui/Skeleton";

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const id = userId ? Number(userId) : NaN;

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["user", "profile", id],
    queryFn: () => userApi.getUserProfile(id),
    enabled: Number.isInteger(id),
  });

  if (!Number.isInteger(id)) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <p className="text-text-muted">잘못된 사용자입니다.</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <Skeleton className="h-48 w-full rounded-xl mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <p className="text-text-muted">프로필을 불러올 수 없습니다.</p>
      </main>
    );
  }

  const sellerItems = profile.sellerItems ?? [];

  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="size-24 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {profile.profileUrl ? (
              <img
                src={profile.profileUrl}
                alt={profile.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-primary text-4xl">
                person
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-text-main">{profile.nickname}</h1>
            <p className="text-sm text-text-muted mt-1">회원 #{profile.userId}</p>
          </div>
        </div>

        <div className="border-t border-border p-6">
          <h2 className="text-lg font-bold text-text-main mb-4">
            등록 상품 ({sellerItems.length})
          </h2>
          {sellerItems.length > 0 ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sellerItems.map((item) => (
                <li
                  key={item.itemId}
                  className="rounded-xl border border-border overflow-hidden bg-gray-50"
                >
                  <div className="aspect-square bg-gray-200 relative">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <span className="material-symbols-outlined text-4xl">
                          image
                        </span>
                      </div>
                    )}
                    {item.itemStatus === "DELETED" && (
                      <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                        종료
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium text-text-main truncate">
                      {item.itemName}
                    </p>
                    <p className="text-xs text-text-muted">{item.itemStatus}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">등록한 상품이 없습니다.</p>
          )}
        </div>
      </div>
    </main>
  );
}
