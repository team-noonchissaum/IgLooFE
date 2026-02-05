import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chargeApi } from "@/services/chargeApi";
import { formatKrw, formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MeSidebar } from "@/components/layout/MeSidebar";
import type { ChargeCheckRes } from "@/lib/types";

export function ChargesPendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromResult = searchParams.get("from") === "result";
  const firstItemRef = useRef<HTMLLIElement>(null);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [page] = useState(0);
  const size = 10;
  const [refundTargetId, setRefundTargetId] = useState<number | null>(null);
  const [refundReasonMap, setRefundReasonMap] = useState<Map<number, string>>(
    new Map()
  );

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["charges", "unchecked", page, size],
    queryFn: () => chargeApi.getUnchecked({ page, size }),
  });

  const confirmMutation = useMutation({
    mutationFn: (chargeCheckId: number) => chargeApi.confirm(chargeCheckId),
    onSuccess: () => {
      addToast("지갑에 반영되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["charges", "unchecked"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      chargeApi.cancel(id, reason),
    onSuccess: (_, variables) => {
      addToast("환불 요청이 처리되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["charges", "unchecked"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setRefundTargetId(null);
      setRefundReasonMap((prev) => {
        const next = new Map(prev);
        if (variables?.id != null) next.delete(variables.id);
        return next;
      });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err);
      const isTossRelated =
        /토스|toss|취소|cancel|payment|결제/i.test(msg) ||
        (typeof err === "object" &&
          err !== null &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 400);
      addToast(
        isTossRelated
          ? "환불 처리에 실패했습니다. 이미 처리된 결제이거나 토스페이먼츠 상태를 확인해 주세요."
          : msg,
        "error"
      );
    },
  });

  // 결제 완료 후 이동한 경우: 상단(방금 결제된 항목)으로 스크롤 + URL에서 from 제거
  useEffect(() => {
    if (!fromResult || isLoading || list.length === 0) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("from");
        return next;
      },
      { replace: true }
    );
    requestAnimationFrame(() => {
      firstItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [fromResult, isLoading, list.length, setSearchParams]);

  const handleRefund = (item: ChargeCheckRes) => {
    setRefundTargetId(item.chargeCheckId);
  };

  const handleRefundSubmit = (id: number) => {
    const reason = refundReasonMap.get(id)?.trim() || "사용자 요청";
    cancelMutation.mutate({ id, reason });
  };

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <MeSidebar />
        <section className="flex-1">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-3xl md:text-4xl font-black leading-tight text-text-main">
              충전대기 목록
            </h1>
            <p className="text-text-muted">
              결제 완료 후 아직 지갑에 반영되지 않은 충전 내역입니다. 승인하면
              지갑에 반영되며, 환불 시 결제가 취소됩니다.
            </p>
          </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">
              account_balance_wallet
            </span>
            <p className="font-medium">충전대기 내역이 없습니다.</p>
            <Link
              to="/credits/charge"
              className="inline-block mt-4 text-primary font-semibold hover:underline"
            >
              크레딧 충전하기
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((item, index) => (
              <li
                key={item.chargeCheckId}
                ref={index === 0 ? firstItemRef : undefined}
                className="p-4 sm:p-6 flex flex-col gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl font-bold text-text-main">
                      {formatKrw(item.amount)}
                    </span>
                    <span className="text-sm text-text-muted">
                      충전대기 #{item.chargeCheckId}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    결제일 {formatDateTime(item.createdAt)} · 만료{" "}
                    {formatDateTime(item.expireAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(item.chargeCheckId)}
                    disabled={
                      (confirmMutation.isPending &&
                        confirmMutation.variables === item.chargeCheckId) ||
                      (cancelMutation.isPending &&
                        cancelMutation.variables?.id === item.chargeCheckId)
                    }
                    loading={
                      confirmMutation.isPending &&
                      confirmMutation.variables === item.chargeCheckId
                    }
                  >
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRefund(item)}
                    disabled={
                      (confirmMutation.isPending &&
                        confirmMutation.variables === item.chargeCheckId) ||
                      (cancelMutation.isPending &&
                        cancelMutation.variables?.id === item.chargeCheckId)
                    }
                    loading={
                      cancelMutation.isPending &&
                      cancelMutation.variables?.id === item.chargeCheckId
                    }
                  >
                    환불
                  </Button>
                </div>
                {refundTargetId === item.chargeCheckId && (
                  <div className="w-full bg-gray-50 border border-border rounded-lg p-4">
                    <label className="block text-sm font-semibold text-text-main mb-2">
                      환불 사유 (선택)
                    </label>
                    <input
                      type="text"
                      value={refundReasonMap.get(item.chargeCheckId) ?? ""}
                      onChange={(e) =>
                        setRefundReasonMap((prev) => {
                          const next = new Map(prev);
                          next.set(item.chargeCheckId, e.target.value);
                          return next;
                        })
                      }
                      placeholder="사용자 요청"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleRefundSubmit(item.chargeCheckId)}
                        loading={
                          cancelMutation.isPending &&
                          cancelMutation.variables?.id === item.chargeCheckId
                        }
                      >
                        환불 요청
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRefundTargetId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          to="/me"
          className="text-primary font-semibold hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          마이페이지로
        </Link>
      </div>
        </section>
      </div>
    </main>
  );
}
