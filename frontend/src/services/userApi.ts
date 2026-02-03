import { api, unwrapData } from "@/lib/api";
import type {
  ProfileRes,
  MyPageRes,
  ProfileUpdateUserReq,
  ProfileUpdateUserRes,
} from "@/lib/types";

/** 유저 - GET /api/users/me, me/mypage, PATCH /api/users/me, DELETE /api/users/me */
export const userApi = {
  getProfile: () =>
    api
      .get<{ message: string; data: ProfileRes }>("/api/users/me")
      .then(unwrapData),

  getMypage: () =>
    api
      .get<{ message: string; data: MyPageRes }>("/api/users/me/mypage")
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
