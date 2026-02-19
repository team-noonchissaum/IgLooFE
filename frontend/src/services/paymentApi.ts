import { api, unwrapData } from "@/lib/api";
import type {
  PaymentPrepareReq,
  PaymentPrepareRes,
  PaymentConfirmReq,
  PaymentConfirmRes,
  PaymentAbortReq,
} from "@/lib/types";

/** 결제 - POST /api/payments/prepare, confirm, abort */
export const paymentApi = {
  prepare: (body: PaymentPrepareReq) =>
    api
      .post<{ message: string; data: PaymentPrepareRes }>(
        "/api/payments/prepare",
        body
      )
      .then(unwrapData),

  confirm: (body: PaymentConfirmReq) =>
    api
      .post<{ message: string; data: PaymentConfirmRes | null }>(
        "/api/payments/confirm",
        body
      )
      .then(unwrapData),

  abort: (body: PaymentAbortReq) =>
    api.post<{ message: string; data: null }>("/api/payments/abort", body),
};
