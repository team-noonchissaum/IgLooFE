/** 1:1 채팅 페이지 - 미구현 Placeholder (채팅 API 없음) */
export function ChatPage() {
  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-text-main mb-2">1:1 채팅</h1>
      <p className="text-text-muted mb-6">채팅 API가 아직 제공되지 않습니다.</p>
      <div className="bg-primary-light/30 border border-primary/20 rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
          chat
        </span>
        <p className="font-semibold text-text-main">
          채팅방 목록, 메시지 조회/전송/읽음/첨부 기능은 준비 중입니다.
        </p>
        <p className="text-sm text-text-muted mt-2">
          chat 엔티티는 백엔드에 존재하나 컨트롤러/서비스/API는 없습니다.
        </p>
      </div>
    </main>
  );
}
