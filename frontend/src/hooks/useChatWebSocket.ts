import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/stores/authStore";

const WS_BASE = import.meta.env.VITE_WS_BASE ?? "http://localhost:8080";

export interface ChatMessagePayload {
  roomId: number;
  messageId: number;
  senderId: number;
  message: string;
  createdAt: string;
}

export function useChatWebSocket(
  roomId: number | null,
  onMessage: (payload: ChatMessagePayload) => void
) {
  const clientRef = useRef<Client | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const sendMessage = useCallback(
    (message: string) => {
      if (!clientRef.current?.connected || roomId == null) return;
      clientRef.current.publish({
        destination: `/app/chat/rooms/${roomId}/messages`,
        body: JSON.stringify({ message }),
      });
    },
    [roomId]
  );

  useEffect(() => {
    if (roomId == null || !token) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${WS_BASE}/ws`) as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/chat.${roomId}`, (frame) => {
          try {
            const payload = JSON.parse(frame.body) as ChatMessagePayload;
            if (payload?.roomId && payload?.messageId) {
              onMessageRef.current(payload);
            }
          } catch {
            //
          }
        });
      },
    });
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [roomId, token]);

  return { sendMessage };
}
