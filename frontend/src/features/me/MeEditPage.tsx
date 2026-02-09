import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { userApi } from "@/services/userApi";
import { imageApi } from "@/services/imageApi";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MeSidebar } from "@/components/layout/MeSidebar";

const schema = z.object({
  nickname: z.string().min(1, "닉네임을 입력하세요"),
  profileUrl: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

type DeleteStep = "idle" | "warn_first" | "confirm_required";

export function MeEditPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [attemptMessage, setAttemptMessage] = useState<string>("");

  const { data: user } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => userApi.getProfile(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: user
      ? { nickname: user.nickname, profileUrl: user.profileUrl ?? "" }
      : undefined,
  });

  const updateProfile = useMutation({
    mutationFn: (data: FormData) =>
      userApi.updateProfile({
        nickname: data.nickname,
        profileUrl: data.profileUrl ?? undefined,
      }),
    onSuccess: () => {
      addToast("프로필이 수정되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const attemptDelete = useMutation({
    mutationFn: () => userApi.attemptDelete(),
    onSuccess: (res) => {
      if (res.action === "WARN_FIRST") {
        setDeleteStep("warn_first");
        setAttemptMessage(res.message);
      } else if (res.action === "CONFIRM_REQUIRED") {
        setDeleteStep("confirm_required");
        setAttemptMessage(res.message);
      }
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const deleteAccount = useMutation({
    mutationFn: () => userApi.deleteUser(),
    onSuccess: () => {
      useAuthStore.getState().logout();
      window.location.href = "/";
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep("idle");
    setAttemptMessage("");
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadProfileImage = useMutation({
    mutationFn: (file: File) => imageApi.uploadSingle(file, "profile"),
    onSuccess: (url) => {
      setValue("profileUrl", url, { shouldValidate: true });
      addToast("프로필 이미지가 업로드되었습니다.", "success");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <MeSidebar />
        <section className="flex-1">
          <h1 className="text-2xl font-bold text-text-main mb-6">프로필 수정</h1>
          <form
        onSubmit={handleSubmit((data) => updateProfile.mutate(data))}
        className="space-y-6 bg-white rounded-xl border border-border p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-semibold text-text-main mb-1.5">
            닉네임
          </label>
          <input
            {...register("nickname")}
            className="w-full rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="닉네임"
          />
          {errors.nickname && (
            <p className="text-red-500 text-sm mt-1">
              {errors.nickname.message}
            </p>
          )}
          <p className="text-xs text-text-muted mt-1">
            닉네임 중복 검사는 저장 시 서버 검증만 지원합니다.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-main mb-1.5">
            프로필 이미지 URL
          </label>
          <input
            {...register("profileUrl", {
              setValueAs: (v) => (v === "" ? undefined : v),
            })}
            className="w-full rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="https://..."
          />
          <p className="text-xs text-text-muted mt-1">
            URL을 입력하거나 파일을 업로드할 수 있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                uploadProfileImage.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadProfileImage.isPending}
            >
              파일 업로드
            </Button>
          </div>
        </div>
        <Button type="submit" loading={updateProfile.isPending}>
          저장
        </Button>
      </form>
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-bold text-text-main mb-2">회원 탈퇴</h2>
        <p className="text-sm text-text-muted mb-4">
          탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          회원 탈퇴
        </Button>
      </div>
      <Modal
        open={showDeleteModal}
        onClose={closeDeleteModal}
        title="회원 탈퇴"
      >
        {deleteStep === "idle" && (
          <>
            <p className="text-sm text-text-muted mb-4">
              탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 잔액이 있으면
              환전 후 탈퇴할 수 있습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={closeDeleteModal}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => attemptDelete.mutate()}
                loading={attemptDelete.isPending}
              >
                탈퇴 시도
              </Button>
            </div>
          </>
        )}
        {deleteStep === "warn_first" && (
          <>
            <p className="text-sm text-text-muted mb-4">{attemptMessage}</p>
            <div className="flex gap-2 justify-end">
              <Link to="/wallet">
                <Button variant="primary" onClick={closeDeleteModal}>
                  환전하기
                </Button>
              </Link>
              <Button variant="secondary" onClick={closeDeleteModal}>
                취소
              </Button>
            </div>
          </>
        )}
        {deleteStep === "confirm_required" && (
          <>
            <p className="text-sm text-text-muted mb-4">{attemptMessage}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={closeDeleteModal}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteAccount.mutate()}
                loading={deleteAccount.isPending}
              >
                탈퇴 확정
              </Button>
            </div>
          </>
        )}
      </Modal>
        </section>
      </div>
    </main>
  );
}
