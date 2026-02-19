import { api, unwrapData } from "@/lib/api";
import type { AiPipelineReq, AiPipelineRes } from "@/lib/types";

export const aiApi = {
  /** AI 파이프라인 실행 - POST /api/ai/pipeline */
  pipeline: (body: AiPipelineReq) =>
    api
      .post<{ message: string; data: AiPipelineRes }>("/api/ai/pipeline", body)
      .then(unwrapData),
};
