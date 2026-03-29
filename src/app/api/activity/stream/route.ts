import { NextRequest } from "next/server";

// Echtzeit Aktivitäts-Updates via Server-Sent Events (SSE)
// Analog zu /api/tasks/stream — polling-basiert, Vercel Edge-kompatibel

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const authHeader = req.headers.get("authorization") ?? "";
  const baseUrl = req.nextUrl.origin;

  const stream = new ReadableStream({
    async start(controller) {
      // Verbindung bestätigen
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ status: "verbunden", ts: Date.now() })}\n\n`
        )
      );

      let letzterPoll = Date.now() - 30_000; // Erste Anfrage: letzten 30s
      const maxDurchlaeufe = 18; // ~3 Minuten

      for (let i = 0; i < maxDurchlaeufe; i++) {
        await new Promise((r) => setTimeout(r, 10_000));

        try {
          const res = await fetch(
            `${baseUrl}/api/activity?limit=10`,
            { headers: { authorization: authHeader } }
          );

          if (res.ok) {
            const data = await res.json();
            const logs = data.logs ?? data; // Rückwärtskompatibel
            const neueEintraege = Array.isArray(logs)
              ? logs.filter((l: any) => {
                  const ts = new Date(l.createdAt).getTime();
                  return ts >= letzterPoll;
                })
              : [];

            if (neueEintraege.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `event: activity_update\ndata: ${JSON.stringify({
                    logs: neueEintraege,
                    ts: Date.now(),
                  })}\n\n`
                )
              );
            }
          }

          letzterPoll = Date.now();

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
