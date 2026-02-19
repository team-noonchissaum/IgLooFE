import { api, unwrapData } from "@/lib/api";
import type { ChargeCheckRes } from "@/lib/types";

/** 충전 - GET /api/charges/unchecked, POST /api/charges/{id}/confirm */
export const chargeApi = {
  getUnchecked: (params?: { page?: number; size?: number }) =>
    api
      .get<{ message: string; data: ChargeCheckRes[] }>(
        "/api/charges/unchecked",
        { params: { page: params?.page ?? 0, size: params?.size ?? 10 } },
      )
      .then(unwrapData),

  confirm: (chargeCheckId: number) =>
    api.post<{ message: string; data: null }>(
      `/api/charges/${chargeCheckId}/confirm`,
    ),

  cancel: (chargeCheckId: number, cancelReason: string) =>
    api.post<{ message: string; data: null }>(
      `/api/charges/${chargeCheckId}/cancel`,
      { cancelReason },
    ),
};
