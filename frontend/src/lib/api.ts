import axios, { type AxiosError, type AxiosResponse } from "axios";
import { useAuthStore } from "@/stores/authStore";
import type { ApiResponse } from "@/lib/types";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ message?: string }>) => {
    const original = err.config;
    
    const responseMessage =
      err.response?.data &&
      typeof err.response.data === "object" &&
      "message" in err.response.data
        ? String((err.response.data as { message?: unknown }).message ?? "")
        : "";
    const isBlockedError =
      err.response?.status === 403 &&
      (responseMessage.includes("차단") ||
        responseMessage.toUpperCase().includes("BLOCKED"));
    const isAuth = Boolean(useAuthStore.getState().accessToken);

    // 차단된 유저 감지: 로그인 상태 + 차단 관련 403일 때만 리다이렉트
    if (isAuth && isBlockedError) {
      // 문의 페이지가 아닌 경우에만 리다이렉트
      if (!window.location.pathname.includes('/inquiry')) {
        window.location.href = '/inquiry';
        return Promise.reject(err);
      }
    }
    
    if (
      err.response?.status === 401 &&
      original &&
      !(original as { _retry?: boolean })._retry
    ) {
      (original as { _retry?: boolean })._retry = true;
      const refresh = useAuthStore.getState().refreshToken;
      if (refresh) {
        try {
          const { data } = await axios.post<{
            accessToken: string;
            refreshToken: string;
          }>(`${baseURL}/api/auth/refresh`, { refreshToken: refresh });
          useAuthStore
            .getState()
            .setTokens(data.accessToken, data.refreshToken ?? refresh);
          if (original.headers)
            original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = "/";
          return Promise.reject(err);
        }
      }
      // 로그인하지 않은 상태에서 401(예: 공개 API 실패)이면 리다이렉트하지 않고 reject만 함
    }
    return Promise.reject(err);
  },
);

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | {
          message?: unknown;
          error?: { message?: unknown };
          errors?: Array<{ message?: unknown; defaultMessage?: unknown }>;
          data?: { message?: unknown; errorMessage?: unknown };
          errorMessage?: unknown;
        }
      | string
      | undefined;

    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      if (data.message != null) return String(data.message);
      if (data.error?.message != null) return String(data.error.message);
      if (data.errorMessage != null) return String(data.errorMessage);
      if (data.data?.message != null) return String(data.data.message);
      if (data.data?.errorMessage != null) return String(data.data.errorMessage);
      if (data.errors?.[0]?.message != null)
        return String(data.errors[0].message);
      if (data.errors?.[0]?.defaultMessage != null)
        return String(data.errors[0].defaultMessage);
    }
  }
  if (err instanceof Error) return err.message;
  return "오류가 발생했습니다.";
}

/** ApiResponse 래핑된 응답에서 data 추출 (대부분 API용) */
export function unwrapData<T>(res: AxiosResponse<ApiResponse<T>>): T {
  const data = res.data?.data;
  if (data === undefined || data === null) {
    throw new Error(res.data?.message ?? "No data");
  }
  return data;
}
