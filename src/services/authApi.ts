import { api } from "@/lib/api";
import type { AuthTokens } from "@/lib/types";

/** 백엔드 AuthType enum: LOCAL, GOOGLE, KAKAO, NAVER */
export type AuthType = "LOCAL" | "GOOGLE" | "KAKAO" | "NAVER";

/** 로컬 로그인 요청 (LoginReq) */
export interface LoginReqLocal {
  authType: "LOCAL";
  email: string;
  password: string;
}

/** OAuth 로그인 요청 (LoginReq) */
export interface LoginReqOAuth {
  authType: "GOOGLE" | "KAKAO" | "NAVER";
  oauthToken?: string;
  email?: string;
  nickname?: string;
}

export const authApi = {
  signup: (body: { email: string; password: string; nickname: string; address: string }) =>
    api.post<{ userId: number; email: string; nickname: string }>(
      "/api/auth/signup",
      body,
    ),

  login: (body: LoginReqLocal | LoginReqOAuth) =>
    api.post<AuthTokens>("/api/auth/login", body),

  refresh: () => api.post<{ accessToken: string }>("/api/auth/refresh"),

  logout: () => api.post("/api/auth/logout"),

  /** 비밀번호 찾기 (이메일로 재설정 링크 발송) */
  forgotPassword: (email: string) =>
    api.post("/api/auth/password/forgot", { email }),

  /** 비밀번호 재설정 (메일 링크의 token 사용) */
  resetPassword: (token: string, newPassword: string) =>
    api.post("/api/auth/password/reset", { token, newPassword }),
};

export function getOAuthLoginUrl(
  provider: "google" | "kakao" | "naver",
): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  return `${base}/api/oauth2/login/${provider}`;
}
