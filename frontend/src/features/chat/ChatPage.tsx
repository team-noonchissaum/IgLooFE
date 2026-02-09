import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { chatApi, type MyChatRoomRes } from "@/services/chatApi";
import { userApi } from "@/services/userApi";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import type { ChatMessagePayload } from "@/hooks/useChatWebSocket";

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(() =>
    roomIdFromUrl ? Number(roomIdFromUrl) : null
  );

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => chatApi.myRooms(),
  });

  const opponentIds = [...new Set(rooms.map((r) => r.opponentId))];
  const opponentQueries = useQueries({
    queries: opponentIds.map((id) => ({
      queryKey: ["user", id],
      queryFn: () => userApi.getUserProfile(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const opponentMap = Object.fromEntries(
    opponentIds.map((id, i) => {
      const q = opponentQueries[i];
      return [id, q?.data?.nickname ?? `사용자 #${id}`];
    })
  );

  useEffect(() => {
    if (roomIdFromUrl) {
      const id = Number(roomIdFromUrl);
      if (!Number.isNaN(id)) setSelectedRoomId(id);
    }
  }, [roomIdFromUrl]);

  const selectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    setSearchParams({ roomId: String(roomId) }, { replace: true });
  };

  return (
    <main className="flex h-[calc(100vh-8rem)] min-h-[400px]">
      <aside className="w-72 shrink-0 border-r border-border bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-text-main">채팅</h1>
        </div>
        {roomsLoading ? (
          <div className="p-4">
            <Skeleton className="h-16 w-full mb-2" />
            <Skeleton className="h-16 w-full mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <li className="p-6 text-center text-text-muted text-sm">
                참여 중인 채팅방이 없습니다.
              </li>
            ) : (
              rooms.map((room) => (
                <li key={room.roomId}>
                  <button
                    type="button"
                    onClick={() => selectRoom(room.roomId)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors ${
                      selectedRoomId === room.roomId ? "bg-primary/10" : ""
                    }`}
                  >
                    <p className="font-semibold text-text-main truncate">
                      {opponentMap[room.opponentId] ?? "..."}
                    </p>
                    <p className="text-xs text-text-muted">
                      경매 #{room.auctionId}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </aside>
      <section className="flex-1 flex flex-col min-w-0 bg-white">
        {selectedRoomId ? (
          <ChatRoomPanel
            roomId={selectedRoomId}
            rooms={rooms}
            opponentMap={opponentMap}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <p>채팅방을 선택하세요</p>
          </div>
        )}
      </section>
    </main>
  );
}

function ChatRoomPanel({
  roomId,
  rooms,
  opponentMap,
}: {
  roomId: number;
  rooms: MyChatRoomRes[];
  opponentMap: Record<number, string>;
}) {
  const room = rooms.find((r) => r.roomId === roomId);
  const opponentId = room?.opponentId;

  const { data: roomDetail } = useQuery({
    queryKey: ["chat", "room", roomId],
    queryFn: () => chatApi.getRoom(roomId),
  });

  const effectiveOpponentId = opponentId ?? roomDetail?.opponentId;
  const { data: opponentProfile } = useQuery({
    queryKey: ["user", effectiveOpponentId],
    queryFn: () => userApi.getUserProfile(effectiveOpponentId!),
    enabled: effectiveOpponentId != null,
  });
  const opponentName =
    opponentProfile?.nickname ??
    opponentMap[effectiveOpponentId!] ??
    (effectiveOpponentId ? `사용자 #${effectiveOpponentId}` : "상대방");

  const { data: messagesPage, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat", "messages", roomId],
    queryFn: () => chatApi.getMessages(roomId),
  });

  const [messages, setMessages] = useState(messagesPage?.messages ?? []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesPage?.messages) {
      setMessages([...messagesPage.messages].reverse());
    }
  }, [messagesPage?.messages]);

  useQuery({
    queryKey: ["chat", "enter", roomId],
    queryFn: () => chatApi.enterRoom(roomId),
    enabled: !!roomId,
  });

  const appendMessage = (payload: ChatMessagePayload) => {
    setMessages((prev) => [
      ...prev,
      {
        messageId: payload.messageId,
        roomId: payload.roomId,
        senderId: payload.senderId,
        message: payload.message,
        isRead: false,
        createdAt: String(payload.createdAt ?? ""),
      },
    ]);
  };

  const { sendMessage } = useChatWebSocket(roomId, appendMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [input, setInput] = useState("");
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
  };

  return (
    <>
      <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
        <span className="material-symbols-outlined text-text-muted">person</span>
        <h2 className="font-semibold text-text-main truncate">{opponentName}</h2>
        {roomDetail && (
          <span className="text-xs text-text-muted">
            경매 #{roomDetail.auctionId}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.messageId}
              message={msg}
              isMe={roomDetail?.myUserId === msg.senderId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="메시지를 입력하세요"
          className="flex-1 rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <button
          type="button"
          onClick={handleSend}
          className=" rounded-lg bg-primary text-white px-4 py-2 hover:bg-primary/90 font-medium"
        >
          전송
        </button>
      </div>
    </>
  );
}

function ChatMessageBubble({
  message,
  isMe,
}: {
  message: { message: string; senderId: number; createdAt: string };
  isMe: boolean;
}) {
  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isMe
            ? "bg-primary text-white rounded-br-sm"
            : "bg-gray-100 text-text-main rounded-bl-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        <p
          className={`text-xs mt-1 ${
            isMe ? "text-white/80" : "text-text-muted"
          }`}
        >
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
