import { NextRequest } from "next/server";

// SSE-Stream für Echtzeit-Benachrichtigungen
// Polling-basiert, Vercel Edge-kompatibel

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const authHeader = req.headers.get("authorization") ?? "";
  const baseUrl = req.nextUrl.origin;

  // Auth-Cookie weiterleiten für Session-basierte Auth
  const cookieHeader = req.headers.get("cookie") ?? "";

  const stream = new ReadableStream({
    async start(controller) {
      // Verbindung bestätigen
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ status: "verbunden", ts: Date.now() })}\n\n`
        )
      );

      let letzterPoll = Date.now() - 30_000;
      const maxDurchlaeufe = 18; // ~3 Minuten (Vercel Edge Timeout)

      for (let i = 0; i < maxDurchlaeufe; i++) {
        await new Promise((r) => setTimeout(r, 10_000));

        try {
          const res = await fetch(`${baseUrl}/api/notifications?limit=5&unread=true`, {
            headers: {
              authorization: authHeader,
              cookie: cookieHeader,
            },
          });

          if (res.ok) {
            const data = await res.json();
            const neueNotifs = (data.notifications ?? []).filter((n: any) => {
              const ts = new Date(n.createdAt).getTime();
              return ts >= letzterPoll;
            });

            if (neueNotifs.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `event: new_notifications\ndata: ${JSON.stringify({
                    notifications: neueNotifs,
                    unreadCount: data.unreadCount ?? 0,
                    ts: Date.now(),
                  })}\n\n`
                )
              );
            } else {
              // Immer unreadCount aktualisieren
              controller.enqueue(
                encoder.encode(
                  `event: badge_update\ndata: ${JSON.stringify({
                    unreadCount: data.unreadCount ?? 0,
                    ts: Date.now(),
                  })}\n\n`
                )
              );
            }
          }

          letzterPoll = Date.now();

          // Heartbeat
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now(), i })}\n\n`
            )
          );
        } catch {
          break;
        }
      }

      try { controller.close(); } catch {}
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
