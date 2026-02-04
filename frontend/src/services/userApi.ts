import { api, unwrapData } from "@/lib/api";
import type {
  ProfileRes,
  MyPageRes,
  ProfileUpdateUserReq,
  ProfileUpdateUserRes,
} from "@/lib/types";

/** 유저 - GET /api/users/me, PATCH /api/users/me. 마이페이지 - GET /api/mypage */
export const userApi = {
  getProfile: () =>
    api
      .get<{ message: string; data: ProfileRes }>("/api/users/me")
      .then(unwrapData),

  getMypage: () =>
    api
      .get<{ message: string; data: MyPageRes }>("/api/mypage")
      .then(unwrapData),

  updateProfile: (body: ProfileUpdateUserReq) =>
    api
      .patch<{ message: string; data: ProfileUpdateUserRes }>(
        "/api/users/me",
        body
      )
      .then(unwrapData),

  deleteUser: () =>
    api.delete<{ message: string; data: null }>("/api/users/me"),
};
