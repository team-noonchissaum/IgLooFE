# 프론트엔드 리팩토링 요약

## 삭제된 불필요한 파일

### 완료된 삭제
- ✅ `public/test.html` - WebSocket 테스트 파일 (더 이상 필요 없음)
- ✅ `next.config.ts` - Next.js 설정 파일 (Vite 사용 중)
- ✅ `src/features/chatbot/ChatbotPage.tsx` - ChatbotWidget으로 대체됨
- ✅ `postcss.config.js` - `postcss.config.mjs`로 통합

### 수동 삭제 필요 (파일이 열려있어 자동 삭제 실패)
다음 파일/폴더는 에디터에서 닫은 후 수동으로 삭제해주세요:
- `app/` 폴더 전체 - Next.js 구조 (실제로는 Vite + React Router 사용)
- `lib/` 폴더 전체 - `src/lib/`과 중복

## 웹소켓 사용 현황

### ✅ 웹소켓 연결 확인됨

프론트엔드는 **실제로 웹소켓 요청을 보내고 있습니다**.

#### 1. 경매 실시간 업데이트 (`useAuctionWebSocket`)
- **사용 위치:**
  - `src/features/auctions/AuctionDetailPage.tsx` (경매 상세 페이지)
  - `src/features/auctions/AuctionLivePage.tsx` (경매 라이브 페이지)

- **연결 정보:**
  - 엔드포인트: `${VITE_WS_BASE}/ws`
  - 프로토콜: SockJS + STOMP
  - 인증: JWT 토큰 (`Authorization: Bearer ${token}`)
  - 구독 채널:
    - `/topic/auction/{auctionId}` - 실시간 경매 업데이트
    - `/user/queue/auctions/{auctionId}/snapshot` - 스냅샷 요청 응답
  - 발행: `/app/auctions/{auctionId}/snapshot` - 스냅샷 요청

- **기능:**
  - 입찰 성공 시 실시간 가격 업데이트
  - 경매 연장 알림
  - 경매 종료 알림
  - 입찰 내역 실시간 동기화

#### 2. 알림 실시간 업데이트 (`useNotificationWebSocket`)
- **사용 위치:**
  - `src/features/notifications/NotificationsPage.tsx` (알림 페이지)

- **연결 정보:**
  - 엔드포인트: `${VITE_WS_BASE}/ws`
  - 프로토콜: SockJS + STOMP
  - 인증: JWT 토큰 (`Authorization: Bearer ${token}`)
  - 구독 채널: `/user/queue/notifications`

- **기능:**
  - 새 알림 수신 시 알림 목록 자동 갱신
  - 읽지 않은 알림 개수 실시간 업데이트

### 환경 변수 설정

웹소켓 연결을 위해 다음 환경 변수가 필요합니다:

```env
VITE_WS_BASE=https://igloo-auction.duckdns.org
VITE_API_BASE_URL=https://igloo-auction.duckdns.org
```

**Vercel 배포 시:** 프로젝트 설정 → Environment Variables에서 설정 필요

## .gitignore 업데이트

- ✅ `dist/` 폴더 추가 (빌드 결과물)

## 프로젝트 구조

현재 사용 중인 기술 스택:
- **빌드 도구:** Vite
- **라우팅:** React Router v6
- **상태 관리:** Zustand
- **데이터 페칭:** TanStack Query
- **웹소켓:** SockJS + STOMP (@stomp/stompjs)
- **스타일링:** Tailwind CSS

## 다음 단계

1. 수동으로 `app/`, `lib/` 폴더 삭제
2. Vercel 환경 변수 확인 (`VITE_WS_BASE`, `VITE_API_BASE_URL`)
3. 백엔드 CORS 설정 확인 (이미 수정 완료)
