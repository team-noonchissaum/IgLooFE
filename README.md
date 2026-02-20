# IgLooFE

> 중고 경매 서비스 IgLoo의 프론트엔드 애플리케이션

Vite + React + TypeScript 기반 SPA입니다.  
백엔드(Spring Boot) API, STOMP WebSocket, 결제/인증 플로우와 연동합니다.

---

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [핵심 기능](#핵심-기능)
- [프론트엔드 동작 흐름](#프론트엔드-동작-흐름)
- [리포지토리 구조](#레포지토리-구조)
- [기술 스택](#기술-스택)
- [사전 요구사항](#사전-요구사항)
- [로컬 실행 방법](#로컬-실행-방법)
- [라우팅 및 권한 정책](#라우팅-및-권한-정책)
- [실시간(WebSocket) 연동](#실시간websocket-연동)
- [배포](#배포)
- [품질 점검](#품질-점검)
- [환경 변수](#환경-변수)
- [트러블슈팅](#트러블슈팅)

---

## 프로젝트 소개

- 사용자 시나리오:
  - `경매 탐색 -> 상세 확인 -> 입찰 -> 낙찰 결과 확인 -> 결제/지갑 관리`
- 프론트엔드 책임:
  - 화면 라우팅 및 접근 제어
  - REST API 기반 데이터 조회/변경
  - WebSocket 기반 실시간 상태 동기화
  - 인증 토큰 관리 및 401 재발급 처리

---

## 핵심 기능

- 경매 목록/검색/정렬/카테고리 탐색
- 경매 상세/입찰/실시간 상태 갱신
- OAuth 콜백 포함 로그인/비밀번호 재설정 플로우
- 결제 결과 처리 및 크레딧 충전
- 알림, 마이페이지, 지갑, 관리자 페이지
- 사용자 상태 기반 접근 제어(일반/관리자/차단 유저)

---

## 프론트엔드 동작 흐름

![System Architecture](https://github.com/user-attachments/assets/39bf4fa3-0e1d-4dc4-9250-7d54d3f5bf74)

1. 사용자가 브라우저에서 Vercel로 접속하면 React SPA가 로드됨
2. 화면 데이터 요청은 TanStack Query가 REST API로 호출
3. 인증/세션 상태는 Zustand가 관리
4. 실시간 경매/알림/채팅은 STOMP(SockJS)로 WSS 연결해 구독
5. 백엔드 응답(REST/WS)을 받아 UI와 캐시를 갱신

---

## 레포지토리 구조

```text
.
├─ README.md
├─ redis.conf
└─ frontend/
   ├─ src/
   │  ├─ components/         # 공통 UI/레이아웃
   │  ├─ features/           # 도메인별 페이지
   │  ├─ hooks/              # WebSocket 훅 등
   │  ├─ lib/                # API 유틸/공통 타입/포맷
   │  ├─ routes/             # 인증/권한 가드
   │  ├─ services/           # API 모듈
   │  ├─ stores/             # Zustand 상태 저장소
   │  ├─ App.tsx             # 라우트 트리
   │  └─ main.tsx            # 앱 엔트리
   ├─ public/
   ├─ package.json
   ├─ vercel.json
   └─ .env.example
```

---

## 기술 스택

- React 18, TypeScript, Vite 5
- Tailwind CSS
- React Router v6
- TanStack Query v5
- Zustand
- Axios
- `@stomp/stompjs`, `sockjs-client`
- Toss Payments SDK

---

## 사전 요구사항

- Node.js 18 이상
- npm 9 이상
- 백엔드 API 서버 접근 가능 상태

기본 로컬 포트:

- Frontend: `3000`
- Backend API/WS: `8080`

---

## 로컬 실행 방법

`frontend` 디렉토리에서 실행

```bash
cd frontend
npm install
npm run dev
```

빌드/미리보기:

```bash
cd frontend
npm run build
npm run preview
```

---

## 라우팅 및 권한 정책

주요 라우트(`frontend/src/App.tsx`):

- 공개: `/`, `/auctions/:auctionId`, `/users/:userId`, `/login`, `/forgot-password`, `/reset-password`
- 인증 필요: `/auctions/new`, `/credits/charge`, `/wallet`, `/notifications`, `/me`, `/chat`, `/delivery`
- 관리자 필요: `/admin`
- OAuth 콜백: `/oauth/callback`

권한 가드(`frontend/src/routes/guards.tsx`):

- `RequireAuth`: 비인증 시 홈으로 리다이렉트
- `RequireAdmin`: ADMIN 역할만 접근 허용
- 차단 유저(`BLOCKED`)는 문의 페이지(`/inquiry`) 중심으로 제한

---

## 실시간(WebSocket) 연동

WebSocket base는 `VITE_WS_BASE`를 사용하며, 기본 경로는 `${VITE_WS_BASE}/ws`

- 경매 실시간(`frontend/src/hooks/useAuctionWebSocket.ts`)
  - 구독: `/topic/auction/{auctionId}`
  - 개인 스냅샷: `/user/queue/auctions/{auctionId}/snapshot`
  - 발행: `/app/auctions/{auctionId}/snapshot`
- 알림 실시간(`frontend/src/hooks/useNotificationWebSocket.ts`)
  - 구독: `/user/queue/notifications`
- 채팅 실시간(`frontend/src/hooks/useChatWebSocket.ts`)
  - 구독: `/topic/chat.{roomId}`
  - 발행: `/app/chat/rooms/{roomId}/messages`

공통 정책:

- STOMP 연결 헤더에 `Authorization: Bearer <token>` 포함
- 연결 실패 시 재연결 딜레이(`reconnectDelay: 3000`) 사용

---

## 배포

프론트엔드는 Vercel을 통해 배포  
실제 배포 파라미터(프로젝트 루트, 빌드 명령, 출력 디렉토리)는 Vercel 프로젝트 설정을 기준으로 관리

SPA 라우팅 재작성(`frontend/vercel.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 환경 변수

기본 예시 파일: `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE=http://localhost:8080
```

설명:

- `VITE_API_BASE_URL`: REST API base URL
- `VITE_WS_BASE`: WebSocket endpoint host URL
