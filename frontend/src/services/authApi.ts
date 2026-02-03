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
  signup: (body: { email: string; password: string; nickname: string }) =>
    api.post<{ userId: number; email: string; nickname: string }>(
      "/api/auth/signup",
      body,
    ),

  login: (body: LoginReqLocal | LoginReqOAuth) =>
    api.post<AuthTokens>("/api/auth/login", body),

  refresh: () => api.post<{ accessToken: string }>("/api/auth/refresh"),

  logout: () => api.post("/api/auth/logout"),
};

export function getOAuthLoginUrl(
  provider: "google" | "kakao" | "naver",
): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  return `${base}/api/oauth2/login/${provider}`;
}
