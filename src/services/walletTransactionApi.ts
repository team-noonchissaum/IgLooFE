import { api, unwrapData } from "@/lib/api";
import type { PageResponse, WalletTransactionRes } from "@/lib/types";

/** 거래 내역 - GET /api/wallet_transactions/me */
export const walletTransactionApi = {
  getMe: (params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: PageResponse<WalletTransactionRes> }>(
        "/api/wallet_transactions/me",
        { params: { page: params?.page ?? 0, size: params?.size ?? 20 } },
      )
      .then(unwrapData),
};
