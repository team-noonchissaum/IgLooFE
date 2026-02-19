import { api } from "@/lib/api";

export interface UnblockRequestReq {
  email: string;
  nickname: string;
  content: string;
}

/** 문의 - 차단 해제 요청 */
export const inquiryApi = {
  /** 차단 해제 요청 제출 - POST /api/inquiry/unblock */
  submitUnblockRequest: (body: UnblockRequestReq) =>
    api.post<{ message: string; data: null }>("/api/inquiry/unblock", body),
};
