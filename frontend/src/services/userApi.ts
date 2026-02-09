import { api, unwrapData } from "@/lib/api";
import type {
  ProfileRes,
  MyPageRes,
  ProfileUpdateUserReq,
  ProfileUpdateUserRes,
  UserDeleteAttemptRes,
  PageResponse,
  AuctionRes,
} from "@/lib/types";

/** 유저 - GET /api/users/me, PATCH /api/users/me. 마이페이지 - GET /api/mypage */
export const userApi = {
  getProfile: () =>
    api
      .get<{ message: string; data: ProfileRes }>("/api/users/me")
      .then(unwrapData),

  getMypage: () =>
    api.get<{ message: string; data: MyPageRes }>("/api/mypage").then(unwrapData),

  getMyAuctions: (params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<AuctionRes> }>(
        "/api/mypage/auctions",
        { params: { page: params?.page ?? 0, size: params?.size ?? 10 } }
      )
      .then(unwrapData),

  updateProfile: (body: ProfileUpdateUserReq) =>
    api
      .patch<{ message: string; data: ProfileUpdateUserRes }>(
        "/api/users/me",
        body
      )
      .then(unwrapData),

  /** 탈퇴 시도 (첫 클릭) - 잔액 있으면 환전 권장, 두 번째부터 포기 확인 */
  attemptDelete: () =>
    api
      .post<{ message: string; data: UserDeleteAttemptRes }>(
        "/api/users/me/delete-attempt"
      )
      .then(unwrapData),

  /** 강제 탈퇴 (두 번째 클릭 후 확인) */
  deleteUser: () =>
    api.delete<{ message: string; data: null }>("/api/users/me/force"),

  /** 다른 유저 프로필 조회 (닉네임 등) */
  getUserProfile: (userId: number) =>
    api
      .get<{ message: string; data: { userId: number; nickname: string; profileUrl: string | null } }>(
        `/api/users/${userId}`
      )
      .then(unwrapData),
};
