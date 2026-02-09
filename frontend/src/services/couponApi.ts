import { api, unwrapData } from "@/lib/api";

export interface Coupon {
  couponId: number;
  name: string;
  amount: number;
}

export interface IssuedCoupon {
  issuedCouponId: number;
  reason: string;
  amount: number;
  expiration: string; // LocalDate
}

export interface CouponDefReq {
  name: string;
  amount: number;
}

export interface CouponIssueReq {
  couponId: number;
  userIds: number[];
  reason: string;
}

/** 쿠폰 API */
export const couponApi = {
  /** GET /api/coupons - 모든 쿠폰 정의 조회 (관리자) */
  getAllCoupons: () =>
    api
      .get<{ message: string; data: Coupon[] }>("/api/coupons")
      .then(unwrapData),

  /** GET /api/coupons/{couponId} - 특정 쿠폰 정의 조회 (관리자) */
  getCoupon: (couponId: number) =>
    api
      .get<{ message: string; data: Coupon }>(`/api/coupons/${couponId}`)
      .then(unwrapData),

  /** POST /api/coupons - 쿠폰 정의 생성 (관리자) */
  createCoupon: (body: CouponDefReq) =>
    api.post("/api/coupons", body),

  /** PUT /api/coupons/{couponId} - 쿠폰 정의 수정 (관리자) */
  updateCoupon: (couponId: number, body: CouponDefReq) =>
    api.put(`/api/coupons/${couponId}`, body),

  /** DELETE /api/coupons/{couponId} - 쿠폰 정의 삭제 (관리자) */
  deleteCoupon: (couponId: number) =>
    api.delete(`/api/coupons/${couponId}`),

  /** GET /api/coupons/issues - 발급된 쿠폰 목록 조회 (사용자) */
  getIssuedCoupons: () =>
    api
      .get<{ message: string; data: IssuedCoupon[] }>("/api/coupons/issues")
      .then(unwrapData),

  /** POST /api/coupons/issues - 쿠폰 발급 (관리자) */
  issueCoupon: (body: CouponIssueReq) =>
    api.post("/api/coupons/issues", body),

  /** POST /api/coupons/issues/{issuedCouponId} - 쿠폰 사용 (사용자) */
  useCoupon: (issuedCouponId: number) =>
    api.post(`/api/coupons/issues/${issuedCouponId}`),
};
