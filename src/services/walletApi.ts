import { api, unwrapData } from "@/lib/api";
import type { WalletRes } from "@/lib/types";

/** 지갑 - GET /api/wallets/me */
export const walletApi = {
  getMe: () =>
    api
      .get<{ message: string; data: WalletRes }>("/api/wallets/me")
      .then(unwrapData),
};
