import { api, unwrapData } from "@/lib/api";
import type { WithdrawalReq, WithdrawalRes, PageResponse } from "@/lib/types";

/** 출금 - POST /api/withdrawals, GET /api/withdrawals/me */
export const withdrawalApi = {
  request: (body: WithdrawalReq) =>
    api
      .post<{ message: string; data: WithdrawalRes }>("/api/withdrawals", body)
      .then(unwrapData),

  getMe: (params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<WithdrawalRes> }>(
        "/api/withdrawals/me",
        { params: { page: params?.page ?? 0, size: params?.size ?? 20 } },
      )
      .then(unwrapData),
};
