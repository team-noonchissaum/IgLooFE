import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/services/authApi";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력하세요"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.add);
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const resetPassword = useMutation({
    mutationFn: (data: FormData) => {
      if (!token) throw new Error("토큰이 없습니다.");
      return authApi.resetPassword(token, data.newPassword);
    },
    onSuccess: () => {
      addToast("비밀번호가 재설정되었습니다. 로그인해 주세요.", "success");
      navigate("/login", { replace: true });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  if (!token) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-text-main mb-4">
            잘못된 링크입니다
          </h1>
          <p className="text-text-muted mb-6">
            비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.
            <br />
            비밀번호 찾기를 다시 시도해 주세요.
          </p>
          <Link to="/forgot-password">
            <Button type="button">비밀번호 찾기</Button>
          </Link>
          <p className="mt-4">
            <Link to="/login" className="text-sm text-primary hover:underline">
              로그인으로 돌아가기
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-lg p-8">
        <h1 className="text-2xl font-bold text-text-main text-center mb-6">
          비밀번호 재설정
        </h1>
        <form
          onSubmit={handleSubmit((data) => resetPassword.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-text-main mb-1">
              새 비밀번호
            </label>
            <input
              {...register("newPassword")}
              type="password"
              className="w-full rounded-xl border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="8자 이상 입력"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-1">
              새 비밀번호 확인
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              className="w-full rounded-xl border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="비밀번호 다시 입력"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            loading={resetPassword.isPending}
          >
            비밀번호 재설정
          </Button>
        </form>
        <p className="text-center mt-6">
          <Link to="/login" className="text-sm text-text-muted hover:text-primary">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
