import { NextRequest } from "next/server";

// Echtzeit Task-Updates via Server-Sent Events (SSE)
// Vercel-kompatibel: Edge Runtime, polling-basiert

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

      let letzterPoll = Date.now() - 60_000; // Erste Anfrage: letzten 60s
      const maxDurchlaeufe = 18; // ~3 Minuten (Vercel Edge Timeout)

      for (let i = 0; i < maxDurchlaeufe; i++) {
        // 10 Sekunden warten
        await new Promise((r) => setTimeout(r, 10_000));

        try {
          // Tasks laden
          const res = await fetch(`${baseUrl}/api/tasks`, {
            headers: { authorization: authHeader },
          });

          if (res.ok) {
            const tasks = await res.json();
            const neueTasks = Array.isArray(tasks)
              ? tasks.filter((t: any) => {
                  const upd = new Date(t.updatedAt ?? t.createdAt).getTime();
                  return upd >= letzterPoll;
                })
              : [];

            if (neueTasks.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `event: tasks_update\ndata: ${JSON.stringify({
                    tasks: neueTasks,
                    ts: Date.now(),
                  })}\n\n`
                )
              );
            }
          }

          letzterPoll = Date.now();

          // Heartbeat senden
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now(), iteration: i })}\n\n`
            )
          );
        } catch {
          // Bei Fehler: Verbindung schließen, Client reconnectet
          break;
        }
      }

      // Stream schließen (Client reconnectet automatisch via EventSource)
      try { controller.close(); } catch {}
    },

    cancel() {
      // Vom Client abgebrochen
    },
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
