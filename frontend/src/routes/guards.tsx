import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { userApi } from "@/services/userApi";
import { Skeleton } from "@/components/ui/Skeleton";

/** 로그인 필요: 미인증 시 / 로 이동, 차단된 유저는 /inquiry로 이동 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
    enabled: isAuth,
    retry: false,
  });

  if (!isAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 차단된 유저는 문의 페이지로만 이동 가능
  if (profile?.status === "BLOCKED" && location.pathname !== "/inquiry") {
    return <Navigate to="/inquiry" replace />;
  }

  return <>{children}</>;
}

/** ADMIN 역할 필요: 미인증 시 / 로, 일반 유저 시 /me 로 이동, 차단된 유저는 /inquiry로 이동 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const location = useLocation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => userApi.getProfile(),
    enabled: isAuth && role == null,
  });

  useEffect(() => {
    if (profile?.role != null) setRole(profile.role);
  }, [profile?.role, setRole]);

  if (!isAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 차단된 유저는 문의 페이지로만 이동 가능
  if (profile?.status === "BLOCKED" && location.pathname !== "/inquiry") {
    return <Navigate to="/inquiry" replace />;
  }

  const resolvedRole = role ?? profile?.role;
  if (resolvedRole != null && resolvedRole !== "ADMIN") {
    return <Navigate to="/me" replace />;
  }

  if (role == null && isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }

  return <>{children}</>;
}

/** 게스트 전용: 인증 시 /me 로 이동 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  if (isAuth) {
    return <Navigate to="/me" replace />;
  }
  return <>{children}</>;
}
