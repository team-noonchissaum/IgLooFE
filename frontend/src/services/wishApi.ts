import { api, unwrapData } from "@/lib/api";
import type { WishToggleRes, WishItemRes } from "@/lib/types";

/** 찜 토글 - POST /api/item/{itemId}/wish (itemId 필요, 상세에 itemId 없으면 부분구현) */
export const wishApi = {
  toggle: (itemId: number) =>
    api
      .post<{ message: string; data: WishToggleRes }>(
        `/api/item/${itemId}/wish`,
      )
      .then(unwrapData),

  /** 찜 목록 - GET /api/item/wish */
  list: () =>
    api
      .get<{ message: string; data: WishItemRes[] }>("/api/item/wish")
      .then(unwrapData),
};
