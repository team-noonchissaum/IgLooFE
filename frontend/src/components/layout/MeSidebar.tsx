import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/userApi";
import { Skeleton } from "@/components/ui/Skeleton";

export function MeSidebar() {
  const location = useLocation();
  const { data: mypage, isLoading } = useQuery({
    queryKey: ["users", "me", "mypage"],
    queryFn: () => userApi.getMypage(),
  });

  if (isLoading || !mypage) {
    return (
      <aside className="w-full md:w-64 shrink-0">
        <Skeleton className="h-24 w-full mb-8" />
        <Skeleton className="h-48 w-full" />
      </aside>
    );
  }

  const isActive = (path: string) => {
    if (path === "/me") {
      return location.pathname === "/me" || location.pathname === "/me/";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="flex gap-4 items-center mb-8">
        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {mypage.profileUrl ? (
            <img
              src={mypage.profileUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-primary text-3xl">
              person
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-main">
            {mypage.nickname}
          </h1>
          <p className="text-sm text-text-muted">
            {mypage.email ?? "이메일 없음"}
          </p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        <Link
          to="/me/edit"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive("/me/edit")
              ? "bg-primary text-white font-semibold"
              : "hover:bg-gray-100 text-text-main font-medium"
          }`}
        >
          <span className="material-symbols-outlined">edit</span>
          프로필 수정
        </Link>
        <Link
          to="/wallet"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive("/wallet")
              ? "bg-primary text-white font-semibold"
              : "hover:bg-gray-100 text-text-main font-medium"
          }`}
        >
          <span className="material-symbols-outlined fill-icon">
            account_balance_wallet
          </span>
          지갑
        </Link>
        <Link
          to="/notifications"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive("/notifications")
              ? "bg-primary text-white font-semibold"
              : "hover:bg-gray-100 text-text-main font-medium"
          }`}
        >
          <span className="material-symbols-outlined">notifications</span>
          알림
        </Link>
        <Link
          to="/me/wishes"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive("/me/wishes")
              ? "bg-primary text-white font-semibold"
              : "hover:bg-gray-100 text-text-main font-medium"
          }`}
        >
          <span className="material-symbols-outlined">favorite</span>
          찜 목록
        </Link>
        <Link
          to="/me/charges"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive("/me/charges")
              ? "bg-primary text-white font-semibold"
              : "hover:bg-gray-100 text-text-main font-medium"
          }`}
        >
          <span className="material-symbols-outlined">pending_actions</span>
          충전대기 목록 보기
        </Link>
      </nav>
    </aside>
  );
}
