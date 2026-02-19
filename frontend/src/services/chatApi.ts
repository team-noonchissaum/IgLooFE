import { api, unwrapData } from "@/lib/api";

export interface MyChatRoomRes {
  roomId: number;
  auctionId: number;
  opponentId: number;
  opponentRole: string;
  createdAt: string;
}

export interface ChatRoomRes {
  roomId: number;
  auctionId: number;
  buyerId: number;
  sellerId: number;
  myUserId: number;
  myRole: string;
  opponentId: number;
  opponentRole: string;
  createdAt: string;
}

export interface ChatMessageRes {
  messageId: number;
  roomId: number;
  senderId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessagePageRes {
  messages: ChatMessageRes[];
  nextCursor: number | null;
  hasNext: boolean;
}

/** 채팅 API */
export const chatApi = {
  /** 내 채팅방 목록 */
  myRooms: () =>
    api
      .get<{ message: string; data: MyChatRoomRes[] }>("/api/chat/rooms")
      .then(unwrapData),

  /** 채팅방 상세 */
  getRoom: (roomId: number) =>
    api
      .get<{ message: string; data: ChatRoomRes }>(`/api/chat/rooms/${roomId}`)
      .then(unwrapData),

  /** 입장 시 읽음 처리 */
  enterRoom: (roomId: number) =>
    api
      .post<{ message: string; data: number }>(
        `/api/chat/room/${roomId}/enter`
      )
      .then(unwrapData),

  /** 메시지 목록 (cursor 페이징) */
  getMessages: (roomId: number, params?: { cursor?: number; size?: number }) =>
    api
      .get<{ message: string; data: ChatMessagePageRes }>(
        `/api/chat/rooms/${roomId}/messages`,
        {
          params: {
            cursor: params?.cursor,
            size: params?.size ?? 20,
          },
        }
      )
      .then(unwrapData),

  /** 경매 기준 채팅방 생성 또는 조회 */
  ensureRoomFromAuction: (auctionId: number) =>
    api
      .post<{ message: string; data: ChatRoomRes }>(
        `/api/chat/rooms/from-auction/${auctionId}`
      )
      .then(unwrapData),
};
