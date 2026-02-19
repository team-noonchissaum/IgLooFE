# 다음 작업 TODO

백엔드에서 API가 추가·확장되면 아래 지점에 연동하면 됩니다.

## 미구현 API 연동 지점

### 1. 배송 (Delivery)

- **위치**: `src/features/delivery/DeliveryPage.tsx`
- **현재**: Placeholder 문구만 표시
- **연동 시**: 구매/판매 배송 목록 API, 배송 단계/트래킹 번호/택배사 API 연동 후 목록·상세·상태 표시

### 2. 1:1 채팅 (Chat)

- **위치**: `src/features/chat/ChatPage.tsx`
- **현재**: Placeholder 문구만 표시
- **연동 시**: 채팅방 목록, 메시지 조회/전송/읽음/첨부 API 및 WebSocket 연동

### 3. 알림 확장

- **위치**: `src/features/notifications/NotificationsPage.tsx`, `src/stores/` (unread-count)
- **연동 시**: 알림 삭제 API, 탭별 필터(입찰/시스템 등), 페이징 API 지원 시 UI 반영

### 4. 내 등록 경매 (My Auctions)

- **위치**: `src/features/me/MePage.tsx`
- **현재**: "내 등록 경매 목록은 서버 미지원" 문구
- **연동 시**: 판매자 기준 경매 목록 API 추가 시 `src/services/auctionApi.ts`에 `myList()` 등 추가 후 MePage에서 조회·링크

### 5. 닉네임 사전 중복 검사

- **위치**: `src/features/me/MeEditPage.tsx`
- **연동 시**: 닉네임 중복 검사 API 추가 시 입력 blur/버튼으로 호출 후 에러 메시지 표시

### 6. 프로필 이미지 파일 업로드

- **위치**: `src/features/me/MeEditPage.tsx`
- **연동 시**: multipart 업로드 API 제공 시 파일 선택 → 업로드 → URL 반영

### 7. 경매 등록 이미지 파일 업로드

- **위치**: `src/features/auctions/AuctionRegisterPage.tsx`
- **현재**: imageUrls 문자열 리스트만 입력
- **연동 시**: 이미지 업로드 API(또는 presigned URL) 연동 후 업로드된 URL을 imageUrls에 설정

### 8. 관리자: 차단 게시글 목록 / 통계

- **위치**: `src/features/admin/AdminPage.tsx`
- **현재**: 차단 게시글 목록은 호출하지 않음, 통계는 placeholder 응답 표시
- **연동 시**: `/api/admin/items/blocked` 실제 목록 반환 시 테이블 표시, `/api/admin/statistics` 실제 데이터 시 차트/요약 표시

### 9. 찜 (상세 화면)

- **위치**: `src/features/auctions/AuctionDetailPage.tsx`
- **연동 시**: 경매 상세 DTO에 `itemId` 포함되면 `wishApi.toggle(itemId)` 호출 및 찜 상태 표시

### 10. 결제 redirect URL

- **위치**: `src/features/credits/CreditsChargePage.tsx`, `src/features/payment/PaymentResultPage.tsx`
- **연동 시**: PG 결제 완료 후 redirect URL을 `/payments/result?orderKey=...&paymentKey=...&success=...` 형태로 맞추고, PaymentResultPage에서 confirm/abort 호출 파라미터를 백엔드 스펙에 맞게 수정

---

## 기타 개선

- **에러 공통화**: API 에러 메시지 토스트 + 화면별 fallback 컴포넌트 정리
- **접근성**: 버튼/폼 라벨/키보드 포커스 검토
- **타입**: 백엔드 DTO 변경 시 `src/lib/types.ts` 및 각 API 응답 타입 동기화
