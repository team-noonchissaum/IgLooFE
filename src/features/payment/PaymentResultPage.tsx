import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { paymentApi } from "@/services/paymentApi";
import { getApiErrorMessage } from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import type { PaymentConfirmRes } from "@/lib/types";

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.add);
  const processedRef = useRef(false);
  const [confirmRes, setConfirmRes] = useState<PaymentConfirmRes | null>(null);

  const pgOrderId = searchParams.get("orderId") ?? searchParams.get("orderKey");
  const paymentKey = searchParams.get("paymentKey");
  const amount = searchParams.get("amount");
  const paymentId = searchParams.get("paymentId");
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (pgOrderId && paymentKey) {
      paymentApi
        .confirm({
          pgOrderId,
          paymentKey,
          amount: amount ? Number(amount) : undefined,
        })
        .then((data) => {
          setConfirmRes(data ?? null);
          addToast("결제가 완료되었습니다.", "success");
        })
        .catch((err) => addToast(getApiErrorMessage(err), "error"));
      return;
    }

    if (paymentId) {
      paymentApi
        .abort({
          paymentId: paymentId ? Number(paymentId) : 0,
          reason: code ? `${code}:${message ?? ""}` : "user_cancel",
        })
        .catch(() => {});
    }
    if (code || message) {
      addToast(`결제 실패: ${message ?? code}`, "error");
    } else {
      addToast("결제가 취소되었거나 실패했습니다.", "error");
    }
  }, [pgOrderId, paymentKey, amount, paymentId, code, message, addToast]);

  const isSuccess = Boolean(pgOrderId && paymentKey);
  const amountNum = amount ? Number(amount) : confirmRes ? undefined : 0;

  const goToChargesPending = () => {
    navigate("/me/charges?from=result");
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start py-12 px-4 gap-12">
      <div className="w-full max-w-[640px] flex flex-col items-center">
        {isSuccess ? (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-green-600 text-5xl">
                  check_circle
                </span>
              </div>
              <h1 className="text-text-main tracking-tight text-[32px] font-bold leading-tight text-center">
                결제 완료
              </h1>
              <p className="text-text-muted text-center mt-2">
                충전 승인 내역에서 승인하면 지갑에 반영됩니다.
              </p>
            </div>
            {(amountNum ?? 0) > 0 && (
              <div className="w-full bg-white rounded-xl shadow-lg border border-border overflow-hidden mb-6">
                <div className="p-6 flex flex-col items-center justify-center py-4 bg-primary/5 rounded-lg mx-4 mt-4">
                  <span className="text-primary text-4xl font-extrabold">
                    + {(amountNum ?? 0).toLocaleString()} 크레딧
                  </span>
                  <p className="text-text-muted text-sm mt-1">
                    승인 후 지갑에 반영됩니다
                  </p>
                </div>
              </div>
            )}

            <div className="w-full max-w-md mb-6">
              <Button className="w-full" onClick={goToChargesPending}>
                충전승인내역에서 승인하기
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="size-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-5xl">
                  warning
                </span>
              </div>
              <h1 className="text-text-main tracking-tight text-[32px] font-bold leading-tight text-center">
                결제 실패
              </h1>
              <p className="text-text-muted text-center mt-2">
                결제 처리에 실패했습니다. 다시 시도해 주세요.
              </p>
            </div>
          </>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Link to="/wallet" className="flex-1">
            <Button variant="secondary" className="w-full">
              지갑 보기
            </Button>
          </Link>
          <Link to="/me/charges" className="flex-1">
            <Button variant="secondary" className="w-full">
              충전승인내역
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button variant="secondary" className="w-full">
              경매 둘러보기
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
