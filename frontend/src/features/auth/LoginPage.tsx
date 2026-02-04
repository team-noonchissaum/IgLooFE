import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi, getOAuthLoginUrl } from "@/services/authApi";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
  nickname: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/me";
  const addToast = useToastStore((s) => s.add);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const hasShownRedirectToast = useRef(false);
  useEffect(() => {
    if (
      !hasShownRedirectToast.current &&
      redirect &&
      redirect !== "/me" &&
      redirect.startsWith("/")
    ) {
      hasShownRedirectToast.current = true;
      addToast("경매 등록을 위해 로그인해 주세요.", "info");
    }
  }, [redirect, addToast]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", nickname: "" },
  });

  const login = useMutation({
    mutationFn: (data: FormData) =>
      authApi.login({
        authType: "LOCAL",
        email: data.email,
        password: data.password,
      }),
    onSuccess: (res) => {
      setTokens(res.data.accessToken, res.data.refreshToken, res.data.role);
      addToast("로그인되었습니다.", "success");
      navigate(redirect.startsWith("/") ? redirect : "/me", { replace: true });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const signup = useMutation({
    mutationFn: (data: FormData) =>
      authApi.signup({
        email: data.email,
        password: data.password,
        nickname: (data.nickname || data.email.split("@")[0]).trim(),
      }),
    onSuccess: (_res, variables) => {
      addToast("회원가입되었습니다. 로그인합니다.", "success");
      // 백엔드 signup은 토큰을 반환하지 않으므로 로그인 호출
      authApi
        .login({
          authType: "LOCAL",
          email: variables.email,
          password: variables.password,
        })
        .then((loginRes) => {
          setTokens(
            loginRes.data.accessToken,
            loginRes.data.refreshToken,
            loginRes.data.role
          );
          navigate(redirect.startsWith("/") ? redirect : "/me", { replace: true });
        })
        .catch((err) => addToast(getApiErrorMessage(err), "error"));
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const onSubmit = (data: FormData) => {
    if (mode === "login") login.mutate(data);
    else signup.mutate(data);
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-lg p-8">
        <h1 className="text-2xl font-bold text-text-main text-center mb-6">
          Igloo
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-1">
              비밀번호
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full rounded-xl border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">
                닉네임
              </label>
              <input
                {...register("nickname")}
                className="w-full rounded-xl border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="닉네임"
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            loading={login.isPending || signup.isPending}
          >
            {mode === "login" ? "로그인" : "회원가입"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full mt-4 text-sm text-primary hover:underline"
        >
          {mode === "login"
            ? "계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </button>
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-text-muted text-center mb-3">
            소셜 로그인
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={getOAuthLoginUrl("google")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined">mail</span>
              Google
            </a>
            <a
              href={getOAuthLoginUrl("kakao")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 hover:bg-gray-50 transition-colors"
            >
              Kakao
            </a>
            <a
              href={getOAuthLoginUrl("naver")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 hover:bg-gray-50 transition-colors"
            >
              Naver
            </a>
          </div>
        </div>
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-text-muted hover:text-primary">
            홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}
