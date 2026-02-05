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

export function ChatbotPage() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<ChatNodeRes | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [action, setAction] = useState<ChatActionRes | null>(null);

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["chatbot", "scenarios"],
    queryFn: () => chatbotApi.listScenarios(),
    enabled: isAuth,
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
            text: "요청을 처리할 수 있습니다.",
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

  if (!isAuth) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-text-main mb-2">챗봇</h1>
        <p className="text-text-muted mb-6">로그인 후 이용할 수 있습니다.</p>
        <Link to="/login">
          <Button>로그인</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-text-main mb-6">챗봇</h1>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="bg-white border border-border rounded-xl p-4 h-fit">
          <h2 className="text-sm font-semibold text-text-muted mb-3">
            시나리오
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
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
                  <p className="text-xs text-text-muted">{s.description}</p>
                </button>
              ))}
              {scenarios.length === 0 && (
                <p className="text-sm text-text-muted">
                  등록된 시나리오가 없습니다.
                </p>
              )}
            </div>
          )}
        </aside>

        <section className="bg-white border border-border rounded-xl p-6 min-h-[420px] flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <p className="text-text-muted text-sm">
                시나리오를 선택해 대화를 시작하세요.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
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
            <p className="text-xs text-text-muted">
              이 대화는 종료되었습니다.
            </p>
          )}

          {actionLink && (
            <div className="pt-2 border-t border-border">
              {actionLink.external ? (
                <a
                  href={actionLink.target}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-semibold hover:underline"
                >
                  링크로 이동
                </a>
              ) : (
                <Link
                  to={actionLink.target}
                  className="text-primary font-semibold hover:underline"
                >
                  링크로 이동
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
