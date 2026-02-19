import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { walletApi } from "@/services/walletApi";
import { paymentApi } from "@/services/paymentApi";
import { formatKrw } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/stores/toastStore";

const PRESET_AMOUNTS = [
  { credits: 10000, label: "10,000 크레딧", price: 11000 },
  { credits: 50000, label: "50,000 크레딧", price: 55000, best: true },
  { credits: 100000, label: "100,000 크레딧", price: 110000 },
];

export function CreditsChargePage() {
  const addToast = useToastStore((s) => s.add);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as
    | string
    | undefined;

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMe(),
  });

  const handleCharge = async (amount: number) => {
    if (isRequesting) return;
    try {
      setIsRequesting(true);
      if (!tossClientKey) {
        addToast(
          "TOSS_CLIENT_KEY가 설정되지 않았습니다. (.env.dev 확인)",
          "error"
        );
        return;
      }
      const prepare = await paymentApi.prepare({
        amount,
        provider: "TOSS",
      });
      if (prepare.pgOrderId) {
        const origin = window.location.origin;
        const successUrl = `${origin}/payments/result?paymentId=${prepare.paymentId}`;
        const failUrl = `${origin}/payments/result?paymentId=${prepare.paymentId}`;

        const tossPayments = await loadTossPayments(tossClientKey);
        const payment = tossPayments.payment({ customerKey: ANONYMOUS });
        await payment.requestPayment({
          method: "CARD",
          amount: { value: amount, currency: "KRW" },
          orderId: prepare.pgOrderId,
          orderName: "크레딧 충전",
          successUrl,
          failUrl,
        });
        return; // requestPayment 호출 후 리다이렉트됨
      }
      addToast("결제 준비 API 응답 형식을 확인해 주세요.", "error");
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err), "error");
    } finally {
      setIsRequesting(false);
    }
  };

  const amountToCharge =
    selectedAmount ??
    (customAmount ? Number(customAmount.replace(/\D/g, "")) : 0);

  return (
    <main className="flex-1 justify-center py-10 px-4">
      <div className="max-w-[800px] mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-text-main leading-tight tracking-tight">
            크레딧 충전
          </h1>
          <p className="text-text-muted text-base">
            잔액을 충전하여 경매에 참여하세요.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-border flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-text-muted text-xs font-bold uppercase tracking-widest">
              현재 잔액
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-text-main">
                {wallet?.balance?.toLocaleString() ?? 0}
              </p>
              <p className="text-primary font-bold">크레딧</p>
            </div>
          </div>
        </div>
        <section>
          <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              payments
            </span>
            충전 금액 선택
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset.credits}
                type="button"
                onClick={() => setSelectedAmount(preset.credits)}
                className={`group cursor-pointer relative flex flex-col gap-3 rounded-xl border-2 p-5 transition-all text-left ${
                  selectedAmount === preset.credits
                    ? "border-primary bg-primary-light/50 shadow-md"
                    : "border-border hover:border-primary/50 bg-white shadow-sm"
                }`}
              >
                {preset.best && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded uppercase">
                    추천
                  </span>
                )}
                <span className="material-symbols-outlined text-primary">
                  toll
                </span>
                <div>
                  <p className="text-lg font-bold text-text-main">
                    {preset.label}
                  </p>
                  <p className="text-text-muted text-sm">
                    {formatKrw(preset.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-text-main mb-2">
              직접 입력 (원)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="금액 입력"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/\D/g, ""));
                setSelectedAmount(null);
              }}
              className="w-full rounded-xl border border-border px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <p className="text-text-muted text-xs mt-4">
            결제 수단: TOSS (부분구현)
          </p>
        </section>
        <div className="flex justify-end">
          <Button
            onClick={() => handleCharge(amountToCharge)}
            disabled={amountToCharge < 1000 || isRequesting}
            loading={isRequesting}
          >
            {amountToCharge >= 1000
              ? `${amountToCharge.toLocaleString()}원 결제하기`
              : "금액을 선택하세요"}
          </Button>
        </div>
      </div>
    </main>
  );
}
