import { io, type Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";

// The rides gateway is the `/rides` Socket.IO namespace on the same server as the REST
// API, one level up from the `/api/v1` prefix. Staff accounts join their rooms on connect,
// so there is nothing to subscribe to.
const SOCKET_ORIGIN = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;
let users = 0;

/**
 * The one desk socket, shared by everything that listens for live events (routing alerts on every
 * page, the inbox's hand-off and update alerts). The last `releaseDeskSocket` closes it. Callers
 * add handlers with `socket.on(event, handler)` and must remove only their own with
 * `socket.off(event, handler)` — never `off(event)` alone, which would silence the others.
 */
export function acquireDeskSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_ORIGIN}/rides`, {
      transports: ["websocket"],
      // A function, so a reconnect after the access token was refreshed sends the new one.
      auth: (send) => send({ token: getToken() }),
    });
  }
  users += 1;
  return socket;
}

export function releaseDeskSocket(): void {
  users = Math.max(0, users - 1);
  if (users === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
