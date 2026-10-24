"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://192.168.0.124:3032";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
  }
  return socket;
}

export function useSocket(event: string, handler: (data: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    const cb = (data: any) => handlerRef.current(data);
    s.on(event, cb);
    return () => {
      s.off(event, cb);
    };
  }, [event]);
}
