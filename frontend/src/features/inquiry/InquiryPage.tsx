import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { inquiryApi } from "@/services/inquiryApi";
import { userApi } from "@/services/userApi";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";

export function InquiryPage() {
  const addToast = useToastStore((s) => s.add);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", accessToken],
    queryFn: () => userApi.getProfile(),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const submitInquiry = useMutation({
    mutationFn: (data: { email: string; nickname: string; content: string }) =>
      inquiryApi.submitUnblockRequest(data),
    onSuccess: () => {
      addToast("차단 해제 요청이 접수되었습니다. 검토 후 답변드리겠습니다.", "success");
      setSubmitted(true);
      setEmail("");
      setNickname("");
      setContent("");
    },
    onError: (err) => {
      addToast(getApiErrorMessage(err), "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nickname.trim() || !content.trim()) {
      addToast("모든 항목을 입력해주세요.", "error");
      return;
    }
    submitInquiry.mutate({ email, nickname, content });
  };

  if (submitted) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-2xl p-8 text-center">
          <div className="mb-6">
            <span className="material-symbols-outlined text-6xl text-primary mb-4 inline-block">
              check_circle
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-4">
            요청이 접수되었습니다
          </h1>
          <p className="text-text-muted mb-6">
            차단 해제 요청이 성공적으로 접수되었습니다.
            <br />
            검토 후 이메일로 답변드리겠습니다.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            variant="outline"
            className="w-full md:w-auto"
          >
            새 요청 작성하기
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-main mb-2">
          차단 해제 요청
        </h1>
        <p className="text-text-muted">
          계정이 차단된 경우, 아래 양식을 작성하여 차단 해제를 요청하실 수 있습니다.
        </p>
        {profile?.status === "BLOCKED" && profile?.blockReason && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              차단 사유
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {profile.blockReason}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border border-border rounded-2xl p-8">
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
              info
            </span>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">안내사항</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                <li>차단 사유를 확인하고 재발 방지를 위한 내용을 작성해주세요.</li>
                <li>검토에는 1-3일 정도 소요될 수 있습니다.</li>
                <li>답변은 입력하신 이메일로 발송됩니다.</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-text-main mb-2"
            >
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="답변을 받을 이메일 주소를 입력하세요"
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              required
            />
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-semibold text-text-main mb-2"
            >
              닉네임 <span className="text-red-500">*</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="차단된 계정의 닉네임을 입력하세요"
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              required
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-semibold text-text-main mb-2"
            >
              요청 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="차단 해제를 요청하는 사유와 재발 방지 계획을 작성해주세요"
              rows={8}
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
              required
            />
            <p className="mt-2 text-xs text-text-muted">
              {content.length} / 1000자
            </p>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full py-4 text-lg"
              loading={submitInquiry.isPending}
              disabled={submitInquiry.isPending}
            >
              <span className="material-symbols-outlined">send</span>
              요청 제출하기
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
