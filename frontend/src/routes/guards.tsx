import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/** 로그인 필요: 미인증 시 / 로 이동 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** 게스트 전용: 인증 시 /me 로 이동 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  if (isAuth) {
    return <Navigate to="/me" replace />;
  }
  return <>{children}</>;
}
