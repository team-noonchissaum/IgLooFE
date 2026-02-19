import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/services/auctionApi";
import { categoryApi } from "@/services/categoryApi";
import { aiApi } from "@/services/aiApi";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { imageApi } from "@/services/imageApi";

const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // backend max-file-size: 10MB

const schema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  description: z.string().min(1, "설명을 입력하세요"),
  categoryId: z.number().min(1, "카테고리를 선택하세요"),
  startPrice: z.number().min(100, "시작가는 100원 이상이어야 합니다"),
  imageUrls: z.array(z.string()).optional().default([]),
  auctionDuration: z
    .number()
    .refine(
      (v) => [1, 2, 3, 6, 12, 24].includes(v),
      "1, 2, 3, 6, 12, 24시간 중 선택하세요"
    )
    .optional(),
});

type FormData = z.infer<typeof schema>;

function getRootCategoryId(
  categories: { id: number; parentId: number | null }[],
  categoryId: number
): number {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let current = byId.get(categoryId);
  while (current && current.parentId != null) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current?.id ?? categoryId;
}

function getDescendantLeafCategories(
  categories: { id: number; name: string; parentId: number | null }[],
  rootId: number
) {
  const childrenMap = new Map<number, { id: number; name: string; parentId: number | null }[]>();
  categories.forEach((c) => {
    if (c.parentId != null) {
      const list = childrenMap.get(c.parentId) ?? [];
      list.push(c);
      childrenMap.set(c.parentId, list);
    }
  });

  const byId = new Map(categories.map((c) => [c.id, c]));
  const root = byId.get(rootId);
  if (!root) return [] as { id: number; name: string; parentId: number | null; label: string }[];

  const result: { id: number; name: string; parentId: number | null; label: string }[] = [];
  const stack: Array<{ id: number; path: string[] }> = [{ id: rootId, path: [root.name] }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = childrenMap.get(current.id) ?? [];
    if (children.length === 0) {
      const node = byId.get(current.id);
      if (node) {
        result.push({
          ...node,
          label: current.path.slice(1).join(" > ") || node.name,
        });
      }
      continue;
    }
    children.forEach((child) => {
      stack.push({
        id: child.id,
        path: [...current.path, child.name],
      });
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

export function AuctionRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [imageList, setImageList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
  });

  const mainCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.parentId === null)
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [categories]
  );
  const [mainCategoryId, setMainCategoryId] = useState<number | null>(null);
  const selectableCategories = useMemo(() => {
    if (!mainCategoryId) return [];
    const descendants = getDescendantLeafCategories(categories, mainCategoryId);
    if (descendants.length > 0) {
      return descendants;
    }
    const root = mainCategories.find((c) => c.id === mainCategoryId);
    return root ? [{ ...root, label: root.name }] : [];
  }, [categories, mainCategories, mainCategoryId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: 0,
      startPrice: 1000,
      imageUrls: [],
      auctionDuration: 24,
    },
  });

  const removeImage = (index: number) => {
    const next = imageList.filter((_, i) => i !== index);
    setImageList(next);
    setValue("imageUrls", next);
  };

  const formatFileSizeMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const createAuction = useMutation({
    mutationFn: (data: FormData) =>
      auctionApi.create({
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        startPrice: data.startPrice,
        imageUrls: data.imageUrls.length ? data.imageUrls : [""],
        auctionDuration: data.auctionDuration ?? 24,
      }),
    onSuccess: () => {
      addToast("경매가 등록되었습니다. 보증금이 차감됩니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      navigate("/");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const uploadImages = useMutation({
    mutationFn: (files: File[]) => imageApi.uploadMultiple(files, "item"),
    onSuccess: (urls) => {
      setImageList((prev) => {
        const next = [...prev, ...urls];
        setValue("imageUrls", next);
        return next;
      });
      addToast("이미지 업로드가 완료되었습니다.", "success");
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const generateAiDescription = useMutation({
    mutationFn: () => {
      const currentStartPrice = watch("startPrice");
      const currentDurationHours = watch("auctionDuration") ?? 24;
      const currentDurationMinutes = currentDurationHours * 60; // 시간을 분으로 변환
      
      // 경매 시작/종료 시간 계산 (현재 시간 기준)
      const now = new Date();
      const startAt = now.toISOString();
      const endAt = new Date(now.getTime() + currentDurationHours * 60 * 60 * 1000).toISOString();

      return aiApi.pipeline({
        imageUrls: imageList,
        startPrice: currentStartPrice,
        auctionDuration: currentDurationMinutes,
        startAt,
        endAt,
      });
    },
    onSuccess: (data) => {
      // AI 생성 결과를 폼에 자동 채우기
      const descResult = data.descriptionResult;
      setValue("title", descResult.title);
      setValue("description", descResult.body);
      
      // 카테고리 선택 업데이트
      const selectedCategory = categories.find(
        (c) => c.id === descResult.auction_register_req.categoryId
      );
      
      if (selectedCategory) {
        const rootId = getRootCategoryId(categories, selectedCategory.id);
        setMainCategoryId(rootId);
        setValue("categoryId", selectedCategory.id);
      } else {
        // 카테고리를 찾지 못한 경우에도 ID는 설정
        setValue("categoryId", descResult.auction_register_req.categoryId);
      }

      // 카테고리 신뢰도가 낮으면 사용자에게 알림
      if (data.classifyResult.needs_user_confirmation) {
        addToast(
          "AI가 추천한 카테고리를 확인해주세요. 필요시 수정할 수 있습니다.",
          "info"
        );
      } else {
        addToast("AI 설명이 생성되었습니다. 필요시 수정해주세요.", "success");
      }
    },
    onError: (err) => {
      addToast(getApiErrorMessage(err) || "AI 설명 생성에 실패했습니다.", "error");
    },
  });

  const onSubmit = (data: FormData) => {
    if (imageList.length === 0) {
      addToast(
        "이미지를 1개 이상 추가하세요.",
        "error"
      );
      return;
    }
    createAuction.mutate({ ...data, imageUrls: imageList });
  };

  return (
    <main className="max-w-[1000px] mx-auto px-4 py-8">
      <nav className="flex flex-wrap gap-2 mb-6 text-sm">
        <a href="/" className="text-text-muted hover:text-primary">
          홈
        </a>
        <span className="text-text-muted">/</span>
        <span className="text-text-main font-medium">경매 등록</span>
      </nav>
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl md:text-4xl font-black leading-tight text-text-main">
          경매 등록
        </h1>
        <p className="text-text-muted">
          상품을 등록하고 경매를 시작하세요. 등록 시 보증금이 차감됩니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">
                add_a_photo
              </span>
              <h2 className="text-xl font-bold text-text-main">
                1. 이미지
              </h2>
            </div>
            <p className="text-text-muted text-sm mb-6">
              이미지 파일을 업로드해 등록할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  const oversized = files.filter(
                    (file) => file.size > MAX_IMAGE_FILE_SIZE_BYTES
                  );
                  if (oversized.length > 0) {
                    const namesPreview = oversized
                      .slice(0, 2)
                      .map((file) => file.name)
                      .join(", ");
                    addToast(
                      `이미지 용량은 파일당 최대 10MB입니다. 초과 파일: ${namesPreview}${
                        oversized.length > 2 ? " 외" : ""
                      }`,
                      "error"
                    );
                  }

                  const validFiles = files.filter(
                    (file) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES
                  );
                  if (validFiles.length === 0) {
                    e.target.value = "";
                    return;
                  }
                  uploadImages.mutate(validFiles);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadImages.isPending}
              >
                파일 업로드
              </Button>
              {imageList.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => generateAiDescription.mutate()}
                  loading={generateAiDescription.isPending}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <span className="material-symbols-outlined text-sm mr-1">
                    auto_awesome
                  </span>
                  AI 설명 생성
                </Button>
              )}
              <span className="text-xs text-text-muted">
                업로드 후 URL이 자동으로 추가됩니다. (파일당 최대 {formatFileSizeMB(MAX_IMAGE_FILE_SIZE_BYTES)}MB)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {imageList.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg border-2 border-primary overflow-hidden group"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-sm">
                      close
                    </span>
                  </button>
                </div>
              ))}
              <div
                className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-3xl text-text-muted">
                  upload_file
                </span>
                <span className="text-[10px] font-bold text-text-muted">
                  이미지 추가
                </span>
              </div>
            </div>
            {errors.imageUrls && (
              <p className="text-red-500 text-sm mt-2">
                {errors.imageUrls.message}
              </p>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                description
              </span>
              <h2 className="text-xl font-bold text-text-main">2. 상품 정보</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1.5">
                  경매 제목
                </label>
                <input
                  {...register("title")}
                  placeholder="예: 빈티지 필름 카메라 - 미개봉"
                  className="w-full rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1.5">
                  설명
                </label>
                <textarea
                  {...register("description")}
                  placeholder="상품 설명을 입력하세요"
                  rows={4}
                  className="w-full rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    카테고리 (대분류)
                  </label>
                  <select
                    value={mainCategoryId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setMainCategoryId(val);
                      setValue("categoryId", 0);
                    }}
                    className="w-full rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2"
                  >
                    <option value="">선택</option>
                    {mainCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    카테고리 (소분류)
                  </label>
                  <select
                    {...register("categoryId", {
                      valueAsNumber: true,
                      onChange: (e) => setValue("categoryId", Number(e.target.value)),
                    })}
                    className="w-full rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2"
                    disabled={!mainCategoryId}
                  >
                    <option value={0}>선택</option>
                    {selectableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.categoryId.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    시작가 (원)
                  </label>
                  <input
                    type="number"
                    {...register("startPrice", { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2"
                  />
                  {errors.startPrice && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.startPrice.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1.5">
                  경매 기간 (시간)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 6, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setValue("auctionDuration", hours)}
                      className={`py-2 px-4 rounded-lg border-2 text-sm font-bold transition-all ${
                        watch("auctionDuration") === hours
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-text-main hover:border-primary/50"
                      }`}
                    >
                      {hours}시간
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                settings
              </span>
              <h2 className="text-xl font-bold text-text-main">3. 안내</h2>
            </div>
            <div className="flex gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="material-symbols-outlined text-primary mt-0.5">
                rocket_launch
              </span>
              <div>
                <p className="font-bold text-primary text-sm uppercase tracking-wide">
                  소프트 런치
                </p>
                <p className="text-sm text-text-main leading-relaxed">
                  등록 후 5분 동안은 비공개 상태입니다. 이 시간 내 취소 시
                  보증금이 환불되며, 이후 취소 시 패널티가 부과됩니다.
                </p>
              </div>
            </div>
            <p className="text-text-muted text-xs mt-4">
              자동 연장 설정은 서버 정책에 따릅니다.
            </p>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-border shadow-md overflow-hidden">
              <div className="p-4 border-b border-border bg-gray-50">
                <h3 className="font-bold flex items-center gap-2 text-text-main">
                  <span className="material-symbols-outlined text-primary">
                    account_balance_wallet
                  </span>
                  보증금 안내
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-text-muted">보증금</span>
                  <div className="font-semibold leading-relaxed">
                    <p>시작가 1만원 이하: 1,000원</p>
                    <p>시작가 1만원 초과: 시작가의 10% (올림)</p>
                  </div>
                  <p className="text-xs text-text-muted">
                    등록 후 5분 이내 취소 전액 환불, 이후 취소 시 몰수
                  </p>
                </div>
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <span className="font-bold text-text-main">등록 시 차감</span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <p className="text-[11px] text-red-700 font-medium leading-tight">
                    5분 소프트 런치 이후 취소 시 패널티가 적용될 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50">
                <Button
                  type="submit"
                  className="w-full"
                  loading={createAuction.isPending}
                >
                  등록하기
                </Button>
                <p className="text-[10px] text-text-muted text-center mt-3">
                  등록 시 이용약관에 동의한 것으로 간주됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
