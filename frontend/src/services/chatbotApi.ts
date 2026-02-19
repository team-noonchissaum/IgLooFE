import { api, unwrapData } from "@/lib/api";
import type {
  ChatScenarioSummaryRes,
  ChatNodeRes,
  ChatNextReq,
  ChatNextRes,
} from "@/lib/types";

export const chatbotApi = {
  listScenarios: () =>
    api
      .get<{ message: string; data: ChatScenarioSummaryRes[] }>(
        "/api/chat/scenarios"
      )
      .then(unwrapData),
  startScenario: (scenarioId: number) =>
    api
      .get<{ message: string; data: ChatNodeRes }>(
        `/api/chat/scenarios/${scenarioId}/start`
      )
      .then(unwrapData),
  next: (body: ChatNextReq) =>
    api
      .post<{ message: string; data: ChatNextRes }>(
        "/api/chat/nodes/next",
        body
      )
      .then(unwrapData),
};
