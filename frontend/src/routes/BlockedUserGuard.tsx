import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { userApi } from "@/services/userApi";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * 차단된 유저는 문의 페이지로만 이동 가능
 * 차단된 유저가 다른 페이지에 접근하려고 하면 /inquiry로 리다이렉트
 */
export function BlockedUserGuard({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  const isInquiryPage = location.pathname === "/inquiry" || location.pathname.startsWith("/inquiry");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
    enabled: isAuth && !isInquiryPage,
    retry: false,
  });

  // 차단된 유저이고 문의 페이지가 아닌 경우 리다이렉트
  if (isAuth && profile?.status === "BLOCKED" && !isInquiryPage) {
    return <Navigate to="/inquiry" replace />;
  }

  // 프로필 로딩 중
  if (isAuth && !isInquiryPage && isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }

  return <>{children}</>;
}
