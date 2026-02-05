import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { chatbotApi } from "@/services/chatbotApi";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ChatActionRes, ChatNodeRes } from "@/lib/types";

type ChatMessage = {
  id: string;
  text: string;
  from: "bot" | "user";
};

export function ChatbotWidget() {
  // accessToken을 직접 구독하여 토큰 변경 시 자동 업데이트
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuth = !!accessToken;
  const [isOpen, setIsOpen] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<ChatNodeRes | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [action, setAction] = useState<ChatActionRes | null>(null);

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["chatbot", "scenarios"],
    queryFn: () => chatbotApi.listScenarios(),
    enabled: isAuth && isOpen,
  });

  const startScenario = useMutation({
    mutationFn: (scenarioId: number) => chatbotApi.startScenario(scenarioId),
    onSuccess: (node) => {
      setCurrentNode(node);
      setAction(null);
      setMessages([
        {
          id: `bot-${node.nodeId}`,
          text: node.text,
          from: "bot",
        },
      ]);
    },
  });

  const nextNode = useMutation({
    mutationFn: (payload: { nodeId: number; optionId: number }) =>
      chatbotApi.next(payload),
    onSuccess: (data) => {
      if (data.type === "NODE" && data.node) {
        setCurrentNode(data.node);
        setAction(null);
        setMessages((prev) => [
          ...prev,
          { id: `bot-${data.node!.nodeId}`, text: data.node!.text, from: "bot" },
        ]);
      } else if (data.type === "ACTION") {
        setCurrentNode(null);
        setAction(data.action ?? null);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-action-${Date.now()}`,
            text: "요청을 처리할 수 있는 안내 링크가 있어요.",
            from: "bot",
          },
        ]);
      }
    },
  });

  const handleScenarioSelect = (scenarioId: number) => {
    setActiveScenarioId(scenarioId);
    startScenario.mutate(scenarioId);
  };

  const handleOptionSelect = (optionId: number) => {
    if (!currentNode) return;
    const option = currentNode.options.find((o) => o.optionId === optionId);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${optionId}-${Date.now()}`,
        text: option?.label ?? "선택",
        from: "user",
      },
    ]);
    nextNode.mutate({ nodeId: currentNode.nodeId, optionId });
  };

  const actionLink = useMemo(() => {
    if (!action || action.actionType !== "LINK") return null;
    const target = action.actionTarget;
    if (!target) return null;
    return {
      target,
      external: /^https?:\/\//i.test(target),
    };
  }, [action]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="w-[360px] max-w-[90vw] bg-white border border-border rounded-2xl shadow-xl overflow-hidden mb-3">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                smart_toy
              </span>
              <p className="font-semibold text-text-main">빠른 문의</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-100"
              aria-label="챗봇 닫기"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {!isAuth ? (
            <div className="p-4 text-sm">
              <p className="text-text-muted mb-3">
                로그인하면 더 정확한 안내를 받을 수 있어요.
              </p>
              <Link to="/login">
                <Button className="w-full">로그인</Button>
              </Link>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4 max-h-[520px] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-text-muted mb-2">
                  무엇을 도와드릴까요?
                </p>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {scenarios.map((s) => (
                      <button
                        key={s.scenarioId}
                        type="button"
                        onClick={() => handleScenarioSelect(s.scenarioId)}
                        className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                          activeScenarioId === s.scenarioId
                            ? "border-primary bg-primary/10 text-text-main font-semibold"
                            : "border-border hover:bg-gray-50"
                        }`}
                      >
                        <p className="text-sm font-semibold">{s.title}</p>
                        <p className="text-xs text-text-muted">
                          {s.description}
                        </p>
                      </button>
                    ))}
                    {scenarios.length === 0 && (
                      <p className="text-xs text-text-muted">
                        현재 안내 가능한 항목이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    위에서 항목을 선택하면 바로 안내를 시작해요.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                        m.from === "user"
                          ? "self-end bg-primary text-white"
                          : "self-start bg-gray-100 text-text-main"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))
                )}
              </div>

              {currentNode && currentNode.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {currentNode.options.map((opt) => (
                    <Button
                      key={opt.optionId}
                      variant="outline"
                      size="sm"
                      onClick={() => handleOptionSelect(opt.optionId)}
                      disabled={nextNode.isPending}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}

              {currentNode?.terminal && (
                <p className="text-[11px] text-text-muted">
                  안내가 완료되었습니다. 다른 항목도 선택할 수 있어요.
                </p>
              )}

              {actionLink && (
                <div className="pt-2 border-t border-border">
                  {actionLink.external ? (
                    <a
                      href={actionLink.target}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      안내 링크 열기
                    </a>
                  ) : (
                    <Link
                      to={actionLink.target}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      안내 링크 열기
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="size-14 rounded-full bg-primary text-white shadow-lg shadow-blue-100 flex items-center justify-center hover:bg-primary-hover transition-colors"
        aria-label="챗봇 열기"
      >
        <span className="material-symbols-outlined text-2xl">chat</span>
      </button>
    </div>
  );
}
