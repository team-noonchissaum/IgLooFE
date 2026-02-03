import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { userApi } from "@/services/userApi";

const schema = z.object({
  nickname: z.string().min(1, "닉네임을 입력하세요"),
  profileUrl: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export function MeEditPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => userApi.getProfile(),
  });

  const {
    register,
    handleSubmit,
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

  const deleteAccount = useMutation({
    mutationFn: () => userApi.deleteUser(),
    onSuccess: () => {
      useAuthStore.getState().logout();
      window.location.href = "/";
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
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
            파일 업로드는 미지원이며 URL 저장만 가능합니다.
          </p>
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
        onClose={() => setShowDeleteModal(false)}
        title="회원 탈퇴"
      >
        <p className="text-sm text-text-muted mb-4">
          정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteAccount.mutate()}
            loading={deleteAccount.isPending}
          >
            탈퇴
          </Button>
        </div>
      </Modal>
    </main>
  );
}
