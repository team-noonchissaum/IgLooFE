import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/services/authApi";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const addToast = useToastStore((s) => s.add);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const forgotPassword = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: () => {
      setSent(true);
      addToast("비밀번호 재설정 메일을 발송했습니다. 이메일을 확인해 주세요.", "success");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-lg p-8">
        <h1 className="text-2xl font-bold text-text-main text-center mb-2">
          비밀번호 찾기
        </h1>
        <p className="text-sm text-text-muted text-center mb-6">
          가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
        </p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-center text-text-main">
              이메일로 전송된 링크를 클릭하여 비밀번호를 재설정해 주세요.
            </p>
            <Link to="/login" className="block">
              <Button type="button" className="w-full">
                로그인으로 돌아가기
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit((data) => forgotPassword.mutate(data))} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">
                이메일
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full rounded-xl border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              loading={forgotPassword.isPending}
            >
              재설정 메일 받기
            </Button>
          </form>
        )}

        {!sent && (
          <p className="text-center mt-6">
            <Link to="/login" className="text-sm text-text-muted hover:text-primary">
              로그인으로 돌아가기
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
