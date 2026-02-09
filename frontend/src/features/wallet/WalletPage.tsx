import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/services/walletApi";
import { walletTransactionApi } from "@/services/walletTransactionApi";
import { withdrawalApi } from "@/services/withdrawalApi";
import { couponApi, type IssuedCoupon } from "@/services/couponApi";
import { formatKrw, formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MeSidebar } from "@/components/layout/MeSidebar";

export function WalletPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [page, setPage] = useState(0);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMe(),
  });

  const { data: txPage } = useQuery({
    queryKey: ["wallet_transactions", "me", page],
    queryFn: () => walletTransactionApi.getMe({ page, size: 20 }),
  });

  const { data: issuedCoupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["coupons", "issued"],
    queryFn: () => couponApi.getIssuedCoupons(),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      withdrawalApi.request({
        amount: Number(withdrawAmount.replace(/\D/g, "")),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
      }),
    onSuccess: () => {
      addToast("출금 요청이 접수되었습니다.", "success");
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals", "me"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const useCouponMutation = useMutation({
    mutationFn: (issuedCouponId: number) => couponApi.useCoupon(issuedCouponId),
    onSuccess: () => {
      addToast("쿠폰이 사용되었습니다. 지갑에 충전되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
      queryClient.invalidateQueries({ queryKey: ["wallet_transactions", "me"] });
      queryClient.invalidateQueries({ queryKey: ["coupons", "issued"] });
    },
    onError: (err) => addToast(getApiErrorMessage(err), "error"),
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount.replace(/\D/g, ""));
    if (amount < 10000) {
      addToast(
        "최소 출금액은 10,000원입니다. 수수료 1,000원이 부과됩니다.",
        "error"
      );
      return;
    }
    if (!bankName.trim() || !accountNumber.trim()) {
      addToast("은행명과 계좌번호를 입력하세요.", "error");
      return;
    }
    withdrawMutation.mutate();
  };

  const transactions = txPage?.content ?? [];
  const hasMoreTx = txPage && !txPage.last;

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <MeSidebar />
        <section className="flex-1">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <h1 className="text-4xl font-black leading-tight text-text-main">
                  지갑 & 입출금
                </h1>
                <p className="text-text-muted text-base mt-1">
                  잔액과 거래 내역을 확인하세요.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/credits/charge">
                  <Button className="flex items-center gap-2">
                    <span className="material-symbols-outlined">add_circle</span>
                    충전
                  </Button>
                </Link>
              </div>
            </div>

            {walletLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-border shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-text-muted text-sm font-semibold uppercase tracking-wider">
                      사용 가능 잔액
                    </p>
                    <span className="material-symbols-outlined text-green-500">
                      check_circle
                    </span>
                  </div>
                  <p className="text-text-main text-3xl font-bold leading-tight">
                    {formatKrw(wallet?.balance ?? 0)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-border shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-text-muted text-sm font-semibold uppercase tracking-wider">
                      홀딩된 잔액
                    </p>
                  </div>
                  <p className="text-text-main text-3xl font-bold leading-tight">
                    {formatKrw(wallet?.lockedBalance ?? 0)}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-bold text-text-main mb-4">출금 요청</h2>
              <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1">
                      금액 (원)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="10000"
                      value={withdrawAmount}
                      onChange={(e) =>
                        setWithdrawAmount(e.target.value.replace(/\D/g, ""))
                      }
                      className="rounded-lg border border-border px-4 py-2 w-40 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1">
                      은행명
                    </label>
                    <input
                      type="text"
                      placeholder="국민은행"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="rounded-lg border border-border px-4 py-2 w-40 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1">
                      계좌번호
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="123-456-789"
                      value={accountNumber}
                      onChange={(e) =>
                        setAccountNumber(e.target.value.replace(/\s/g, ""))
                      }
                      className="rounded-lg border border-border px-4 py-2 w-48 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={withdrawMutation.isPending}
                  disabled={
                    !withdrawAmount ||
                    Number(withdrawAmount) < 10000 ||
                    !bankName.trim() ||
                    !accountNumber.trim()
                  }
                >
                  출금 요청
                </Button>
              </form>
              <p className="text-xs text-text-muted mt-2">
                최소 10,000원, 수수료 1,000원
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-bold text-text-main mb-4">보유 쿠폰</h2>
              {couponsLoading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : issuedCoupons.length === 0 ? (
                <p className="text-text-muted text-center py-8">
                  보유한 쿠폰이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {issuedCoupons.map((coupon) => {
                    const expirationDate = new Date(coupon.expiration);
                    const isExpired = expirationDate < new Date();
                    const canUse = !isExpired;

                    return (
                      <div
                        key={coupon.issuedCouponId}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isExpired
                            ? "bg-gray-50 border-gray-200"
                            : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-yellow-600">
                              confirmation_number
                            </span>
                            <p className="font-semibold text-text-main">
                              {formatKrw(coupon.amount)} 쿠폰
                            </p>
                            {isExpired && (
                              <span className="text-xs text-red-500 font-medium">만료됨</span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted mb-1">{coupon.reason}</p>
                          <p className="text-xs text-text-muted">
                            만료일: {new Date(coupon.expiration).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <Button
                          variant={canUse ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (canUse) {
                              if (
                                confirm(
                                  `${formatKrw(coupon.amount)} 쿠폰을 사용하시겠습니까?`
                                )
                              ) {
                                useCouponMutation.mutate(coupon.issuedCouponId);
                              }
                            }
                          }}
                          disabled={!canUse || useCouponMutation.isPending}
                          loading={useCouponMutation.isPending}
                        >
                          {canUse ? "사용하기" : "만료됨"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <h2 className="text-lg font-bold text-text-main p-4 border-b border-border">
                거래 내역
              </h2>
              <ul className="divide-y divide-border">
                {transactions.map((tx) => (
                  <li
                    key={tx.transaction_id}
                    className="p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-text-main">
                        {tx.memo ?? tx.type}
                      </p>
                      <p className="text-sm text-text-muted">
                        {formatDateTime(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={
                        tx.amount >= 0
                          ? "text-green-600 font-bold"
                          : "text-red-600 font-bold"
                      }
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatKrw(tx.amount)}
                    </span>
                  </li>
                ))}
                {transactions.length === 0 && !txPage && (
                  <li className="p-8 text-center text-text-muted">
                    거래 내역이 없습니다.
                  </li>
                )}
              </ul>
              {hasMoreTx && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="text-primary font-semibold hover:underline"
                  >
                    더 보기
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-text-muted">
              거래 유형 필터는 서버 미지원으로 전체 목록만 표시됩니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
