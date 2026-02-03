import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/stores/authStore";

const WS_BASE = import.meta.env.VITE_WS_BASE ?? "http://localhost:8080";

export interface AuctionSnapshot {
  currentPrice?: number;
  bidCount?: number;
  endAt?: string;
  status?: string;
  topBidderNickname?: string;
}

export type AuctionWsMessage =
  | { type: "BID_SUCCESSED"; payload?: unknown }
  | { type: "OUTBID"; payload?: unknown }
  | { type: "AUCTION_EXTENDED"; payload?: unknown }
  | { type: "AUCTION_ENDED"; payload?: unknown }
  | { type: "AUCTION_RESULT"; payload?: unknown }
  | { type: "NOTIFICATION"; payload?: unknown };

export function useAuctionWebSocket(
  auctionId: number | null,
  onSnapshot: (data: AuctionSnapshot) => void,
  onMessage?: (msg: AuctionWsMessage) => void,
) {
  const clientRef = useRef<Client | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const onSnapshotRef = useRef(onSnapshot);
  const onMessageRef = useRef(onMessage);
  onSnapshotRef.current = onSnapshot;
  onMessageRef.current = onMessage;

  const requestSnapshot = useCallback(() => {
    if (!clientRef.current?.connected || auctionId == null) return;
    clientRef.current.publish({
      destination: `/app/auctions/${auctionId}/snapshot`,
      body: JSON.stringify({}),
    });
  }, [auctionId]);

  useEffect(() => {
    if (auctionId == null || !token) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${WS_BASE}/ws`) as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/auction/${auctionId}`, (frame) => {
          try {
            const body = JSON.parse(frame.body) as
              | AuctionWsMessage
              | AuctionSnapshot;
            if (body && typeof body === "object" && "type" in body) {
              onMessageRef.current?.(body as AuctionWsMessage);
            } else {
              onSnapshotRef.current(body as AuctionSnapshot);
            }
          } catch {
            onSnapshotRef.current({});
          }
        });
        client.subscribe(
          `/user/queue/auctions/${auctionId}/snapshot`,
          (frame) => {
            try {
              const data = JSON.parse(frame.body) as AuctionSnapshot;
              onSnapshotRef.current(data);
            } catch {
              //
            }
          },
        );
        requestSnapshot();
      },
    });
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [auctionId, token, requestSnapshot]);

  return { requestSnapshot };
}
