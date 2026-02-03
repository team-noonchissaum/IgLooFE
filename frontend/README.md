# Igloo Frontend

Vite + React + TypeScript + Tailwind 기반 경매 프론트엔드. 백엔드(Spring Boot, JWT, OAuth2, STOMP WebSocket)와 연동합니다.

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 (포트 3000)
npm run dev

# 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

개발 서버는 **포트 3000**에서 동작하며, 백엔드 CORS 허용 origin(`http://localhost:3000`)과 맞춰져 있습니다.

## 환경 변수

프로젝트 루트에 `.env` 파일을 만들고 아래 변수를 설정하세요.

| 변수                | 설명                                          | 예시                    |
| ------------------- | --------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL` | REST API 베이스 URL                           | `http://localhost:8080` |
| `VITE_WS_BASE`      | WebSocket 연결 URL (동일 호스트면 API와 동일) | `http://localhost:8080` |

예시는 `.env.example`을 참고하세요.

## 구현 / 부분구현 / 미구현 매핑표

| 화면/기능                                  | 상태     | 비고                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------ |
| 메인: 경매 목록/페이징/카테고리/검색/정렬  | 구현     | GET /api/auctions, /api/auctions/search                |
| 메인: 찜(카드)                             | 구현     | POST /api/item/{itemId}/wish (itemId 있을 때)          |
| 메인: 알림 뱃지/지갑 요약                  | 구현     | unread-count, GET /api/wallets/me                      |
| 메인: 위치/근처/조회수                     | 미구현   | 백엔드 미지원                                          |
| 제품상세: 상세/입찰내역/입찰하기/실시간 WS | 구현     | requestId(UUID) 필수, WS /topic/auction/{id}, snapshot |
| 제품상세: 찜 토글                          | 부분구현 | 상세 DTO에 itemId 없으면 호출 안 함                    |
| 제품상세: 1:1 문의                         | 미구현   | 채팅 API 없음                                          |
| 제품등록: 경매등록/카테고리/보증금         | 구현     | POST /api/auctions, imageUrls 리스트                   |
| 제품등록: 이미지                           | 부분구현 | URL 리스트만 지원, 파일 업로드 미지원                  |
| 제품등록: 자동연장 토글                    | 미구현   | 서버 정책 자동 적용                                    |
| 경매화면/낙찰: 실시간/타이머/결과          | 구현     | REST + WS                                              |
| 경매낙찰: 1:1 채팅/배송 이동               | 미구현   | UI만, API 없음                                         |
| 결제완료: confirm/abort                    | 구현     | POST /api/payments/confirm, abort                      |
| 크레딧충전: prepare/confirm/미확정목록     | 구현     | TOSS 중심, PG 선택 UI 부분구현                         |
| 입출금: 지갑/거래내역/출금                 | 구현     | 거래유형 서버 필터 미지원                              |
| 알림: 목록/읽음/WS 실시간                  | 구현     | 삭제/필터/페이징 미지원                                |
| 내 정보: 마이페이지/입찰목록/지갑          | 구현     | 내 등록 경매 목록 미지원                               |
| 프로필수정: PATCH/탈퇴                     | 구현     | 닉네임 사전중복검사/프로필 파일업로드 미지원           |
| 배송                                       | 미구현   | Placeholder만                                          |
| 관리자: 신고/유저/차단해제                 | 구현     | 통계/차단게시글목록 placeholder                        |
| 1:1 채팅                                   | 미구현   | Placeholder만                                          |

## 알려진 제약사항

- **찜**: 상세 화면 DTO에 `itemId`가 없으면 찜 API를 호출하지 않음(부분구현).
- **이미지**: 경매 등록 시 파일 업로드 없이 **이미지 URL 리스트**만 전송.
- **PG**: 크레딧 결제는 TOSS 중심이며, 카카오/네이버/카드 선택 UI는 부분구현.
- **거래내역**: 거래유형 필터는 서버 미지원으로 전체 목록만 표시.
- **알림**: 삭제/탭별 필터/페이징 미지원.
- **내 등록 경매**: 판매자 기준 전용 조회 API 없음.
- **닉네임**: 사전 중복 검사 API 없음, 저장 시 서버 검증만.
- **배송/채팅**: 해당 API 없음, 화면은 Placeholder.

## 폴더 구조

```
src/
├── components/     # 공통 UI (layout, ui)
├── features/       # 기능별 페이지 (home, auctions, auth, payment, ...)
├── hooks/          # useAuctionWebSocket, useNotificationWebSocket
├── lib/            # api, types, format
├── routes/         # RequireAuth 등 가드
├── services/      # auctionApi, bidApi, authApi, ...
├── stores/         # authStore, toastStore
├── App.tsx
└── main.tsx
```

## 기술 스택

- Vite, React 18, TypeScript
- Tailwind CSS
- React Router, TanStack Query, Zustand
- Axios, react-hook-form, zod, @hookform/resolvers
- @stomp/stompjs, sockjs-client (실시간)
- dayjs, Intl.NumberFormat (날짜/KRW)
