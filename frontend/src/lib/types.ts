/** 백엔드 ApiResponse 래퍼 - 대부분 API가 이 형태로 반환 */
export interface ApiResponse<T> {
  message: string;
  data: T | null;
}

/** Spring Page */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/** 카테고리 - GET /api/categories (ApiResponse 없이 List 반환) */
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

/** 경매 목록 항목 - GET /api/auctions/search → Page<AuctionListRes> */
export interface AuctionListRes {
  auctionId: number;
  itemId: number;
  title: string;
  currentPrice: number;
  startPrice: number;
  bidCount: number;
  status: AuctionStatus;
  endAt: string;
  sellerNickname: string;
  thumbnailUrl: string | null;
  categoryId: number;
  categoryName: string;
  wishCount: number;
  isWished: boolean | null;
}

/** 경매 상세 - GET /api/auctions/{id} → AuctionRes */
export interface AuctionRes {
  auctionId: number;
  itemId?: number;
  title: string;
  description: string;
  currentPrice: number;
  startPrice: number;
  bidCount: number;
  status: AuctionStatus;
  startAt: string;
  endAt: string;
  sellerId?: number;
  sellerNickname: string;
  imageUrls: string[];
  categoryId: number;
  categoryName: string;
  wishCount: number;
  isWished: boolean | null;
}

export type AuctionStatus =
  | "READY"
  | "RUNNING"
  | "DEADLINE"
  | "ENDED"
  | "SUCCESS"
  | "FAILED"
  | "CANCELED"
  | "BLOCKED";

/** 경매 등록 요청 - POST /api/auctions (AuctionRegisterReq) */
export interface AuctionRegisterReq {
  title: string;
  description: string;
  startPrice: number;
  categoryId: number;
  auctionDuration: number; // 분 단위
  imageUrls: string[];
}

/** 입찰 요청 - POST /api/bid (PlaceBidReq) */
export interface PlaceBidReq {
  auctionId: number;
  bidAmount: number;
  requestId: string;
}

/** 입찰 내역 항목 - GET /api/bid/{auctionId} → Page<BidHistoryItemRes> */
export interface BidHistoryItemRes {
  bidId: number;
  bidderNickname: string;
  bidPrice: number;
  createdAt: string;
}

/** 내 입찰 목록 항목 - GET /api/bid/my → Page<MyBidAuctionRes> */
export interface MyBidAuctionRes {
  auctionId: number;
  itemTitle: string;
  myHighestBidPrice: number;
  currentPrice: number;
  isHighestBidder: boolean;
  auctionStatus: AuctionStatus;
  endTime: string;
  bidCount: number;
}

/** 지갑 - GET /api/wallets/me → WalletRes */
export interface WalletRes {
  id: number;
  userId: number;
  balance: number;
  lockedBalance: number;
}

/** 거래 내역 - GET /api/wallet_transactions/me (백엔드 snake_case 필드) */
export interface WalletTransactionRes {
  transaction_id: number;
  amount: number;
  type: string;
  ref_type: string;
  ref_id: number | null;
  memo: string | null;
  created_at: string;
}

/** 출금 요청 - POST /api/withdrawals (WithdrawalReq) */
export interface WithdrawalReq {
  amount: number;
  bankName: string;
  accountNumber: string;
}

/** 출금 응답 - GET /api/withdrawals/me → Page<WithdrawalRes> */
export interface WithdrawalRes {
  withdrawalId: number;
  amount: number;
  feeAmount: number;
  status: string;
  createdAt: string;
}

/** 결제 준비 요청 - POST /api/payments/prepare */
export interface PaymentPrepareReq {
  amount: number;
  provider: "TOSS";
}

/** 결제 준비 응답 */
export interface PaymentPrepareRes {
  paymentId: number;
  pgOrderId: string;
}

/** 결제 승인 요청 - POST /api/payments/confirm */
export interface PaymentConfirmReq {
  pgOrderId: string;
  paymentKey: string;
  amount?: number;
}

/** 결제 승인 응답 - 카드: chargeCheckId, 가상계좌: virtualAccount */
export interface PaymentConfirmRes {
  virtualAccount?: VirtualAccountInfo | null;
  chargeCheckId?: number | null;
}

/** 챗봇 시나리오 요약 */
export interface ChatScenarioSummaryRes {
  scenarioId: number;
  title: string;
  description: string;
}

/** 챗봇 선택 옵션 */
export interface ChatOptionRes {
  optionId: number;
  label: string;
  nextNodeId: number | null;
  actionType: "NONE" | "LINK" | "API";
  actionTarget: string | null;
}

/** 챗봇 노드 */
export interface ChatNodeRes {
  nodeId: number;
  scenarioId: number;
  text: string;
  terminal: boolean;
  options: ChatOptionRes[];
}

/** 챗봇 액션 */
export interface ChatActionRes {
  actionType: "NONE" | "LINK" | "API";
  actionTarget: string | null;
}

/** 챗봇 다음 노드 응답 */
export interface ChatNextRes {
  type: "NODE" | "ACTION";
  node: ChatNodeRes | null;
  action: ChatActionRes | null;
}

/** 챗봇 다음 노드 요청 */
export interface ChatNextReq {
  nodeId: number;
  optionId: number;
}

/** 가상계좌 정보 (결제 승인 시) */
export interface VirtualAccountInfo {
  bank: string;
  accountNumber: string;
  customerName: string;
  dueDate: string;
}

/** 결제 실패 요청 - POST /api/payments/abort */
export interface PaymentAbortReq {
  paymentId: number;
  reason: string;
}

/** 미확정 충전 목록 - GET /api/charges/unchecked → ChargeCheckRes[] */
export interface ChargeCheckRes {
  chargeCheckId: number;
  paymentId: number;
  amount: number;
  status: string;
  createdAt: string;
  expireAt: string;
}

/** 알림 - GET /api/notifications → NotificationResponse[] */
export interface NotificationRes {
  id: number;
  type: string;
  message: string;
  refType: string | null;
  refId: number | null;
  readAt: string | null;
  createdAt: string;
}

/** 프로필 - GET /api/users/me → ProfileRes */
export interface ProfileRes {
  userId: number;
  nickname: string;
  profileUrl: string | null;
  email: string;
  role: string;
  status: string;
  blockReason?: string | null;
}

/** 마이페이지 - GET /api/mypage → MyPageRes */
export interface MyPageRes {
  userId: number;
  email: string;
  nickname: string;
  profileUrl: string | null;
  balance: number;
}

/** 프로필 수정 요청 - PATCH /api/users/me */
export interface ProfileUpdateUserReq {
  nickname: string;
  profileUrl?: string | null;
}

/** 탈퇴 시도 응답 - POST /api/users/me/delete-attempt */
export interface UserDeleteAttemptRes {
  action: "WARN_FIRST" | "CONFIRM_REQUIRED" | "DELETED";
  balance: number;
  message: string;
}

/** 프로필 수정 응답 */
export interface ProfileUpdateUserRes {
  id: number;
  email: string;
  nickname: string;
  profileUrl: string | null;
  location: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 찜 토글 응답 - POST /api/item/{itemId}/wish → WishToggleRes */
export interface WishToggleRes {
  wished: boolean;
}

/** 찜 목록 항목 - GET /api/item/wish → WishItemRes[] */
export interface WishItemRes {
  itemId: number;
  auctionId: number | null;
  title: string;
  startPrice: number;
  sellerName: string;
  thumbnailUrl: string | null;
  wishCount: number;
  status: boolean;
}

/** 인증 토큰 (Auth API는 ApiResponse 없이 직접 반환) */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId?: number;
  email?: string;
  nickname?: string;
  role?: string;
}
