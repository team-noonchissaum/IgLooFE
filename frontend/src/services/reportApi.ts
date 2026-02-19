import { api } from "@/lib/api";

/** 신고 요청 - POST /api/reports */
export type ReportTargetType = "USER" | "AUCTION";

export interface ReportReq {
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  description?: string;
}

export const reportApi = {
  create: (data: ReportReq) =>
    api.post("/api/reports", data),
};
