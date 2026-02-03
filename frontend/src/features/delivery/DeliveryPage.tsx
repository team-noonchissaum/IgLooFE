/** 배송 페이지 - 미구현 Placeholder (배송 API 없음) */
export function DeliveryPage() {
  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-text-main mb-2">배송 정보</h1>
      <p className="text-text-muted mb-6">
        배송 관련 API가 아직 제공되지 않습니다.
      </p>
      <div className="bg-primary-light/30 border border-primary/20 rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
          local_shipping
        </span>
        <p className="font-semibold text-text-main">
          구매/판매 배송 목록, 배송 단계, 트래킹 번호, 택배사 연동 기능은 준비
          중입니다.
        </p>
        <p className="text-sm text-text-muted mt-2">
          주문 생성은 백엔드에서 수행되나 배송 전용 API는 현재 없습니다.
        </p>
      </div>
    </main>
  );
}
