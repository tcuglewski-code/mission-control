import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Typen für den GitHub Push-Payload ───────────────────────────────────────

interface GitHubCommit {
  id: string;
  message: string;
  url: string;
  author: {
    name: string;
    email?: string;
  };
}

interface GitHubPushPayload {
  ref: string;
  repository: {
    full_name: string;
    name: string;
  };
  commits: GitHubCommit[];
  pusher: {
    name: string;
  };
  head_commit?: GitHubCommit;
}

// ─── HMAC-SHA256 Signatur prüfen ─────────────────────────────────────────────

function verifizierungSignatur(payload: string, signaturHeader: string, secret: string): boolean {
  try {
    const erwarteteSignatur = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    const puffer1 = Buffer.from(signaturHeader, "utf8");
    const puffer2 = Buffer.from(erwarteteSignatur, "utf8");
    // Längenvergleich zuerst — timingSafeEqual erfordert gleiche Pufferlänge
    if (puffer1.length !== puffer2.length) return false;
    return timingSafeEqual(puffer1, puffer2);
  } catch {
    return false;
  }
}

// ─── Haupthandler für POST /api/webhooks/github ───────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Rohen Request-Body als Text lesen (nötig für HMAC-Berechnung)
    const roherBody = await req.text();

    // ── 1. Signatur prüfen ──────────────────────────────────────────────────
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const signaturHeader = req.headers.get("x-hub-signature-256");

    if (webhookSecret) {
      // Secret gesetzt → Signatur ist Pflicht
      if (!signaturHeader) {
        console.error("[GitHub Webhook] Fehlender x-hub-signature-256 Header");
        return NextResponse.json({ error: "Signatur fehlt" }, { status: 401 });
      }
      if (!verifizierungSignatur(roherBody, signaturHeader, webhookSecret)) {
        console.error("[GitHub Webhook] Ungültige Signatur");
        return NextResponse.json({ error: "Ungültige Signatur" }, { status: 401 });
      }
    } else {
      // Dev-Modus: kein Secret gesetzt → Signaturprüfung überspringen
      console.warn("[GitHub Webhook] GITHUB_WEBHOOK_SECRET nicht gesetzt — Dev-Modus, Signatur wird nicht geprüft");
    }

    // ── 2. Event-Typ prüfen ─────────────────────────────────────────────────
    const eventTyp = req.headers.get("x-github-event");
    if (eventTyp !== "push") {
      // Andere Events still ignorieren (z.B. ping bei der Webhook-Registrierung)
      return NextResponse.json({ received: true, message: `Event '${eventTyp}' wird ignoriert` }, { status: 200 });
    }

    // ── 3. Payload parsen ───────────────────────────────────────────────────
    let payload: GitHubPushPayload;
    try {
      payload = JSON.parse(roherBody);
    } catch {
      console.error("[GitHub Webhook] Ungültiger JSON-Body");
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const repoFullName = payload.repository?.full_name;
    const commits = payload.commits ?? [];
    const ref = payload.ref ?? "";
    const pusherName = payload.pusher?.name ?? "Unbekannt";

    // Branch aus ref extrahieren (z.B. "refs/heads/master" → "master")
    const branch = ref.replace(/^refs\/heads\//, "");

    if (!repoFullName) {
      console.error("[GitHub Webhook] repository.full_name fehlt im Payload");
      return NextResponse.json({ error: "repository.full_name fehlt" }, { status: 400 });
    }

    // ── 4. Projekt anhand githubRepo finden ─────────────────────────────────
    const projekt = await prisma.project.findFirst({
      where: { githubRepo: repoFullName },
    });

    if (!projekt) {
      // Kein passendes Projekt — trotzdem 200 zurückgeben (kein Fehler)
      console.warn(`[GitHub Webhook] Kein Projekt für Repo '${repoFullName}' gefunden`);
      return NextResponse.json({ received: true, message: "Kein passendes Projekt gefunden" }, { status: 200 });
    }

    // ── 5. ActivityLog Eintrag erstellen ────────────────────────────────────
    if (commits.length > 0) {
      // Letzten Commit für den primären Log-Eintrag verwenden
      const letzterCommit = commits[commits.length - 1];
      const kurzeCommitId = letzterCommit.id.substring(0, 7);
      const abgeschnitteneNachricht =
        letzterCommit.message.length > 80
          ? letzterCommit.message.substring(0, 80)
          : letzterCommit.message;

      // Metadaten: alle Commits + Branch + Pusher
      const metadaten = {
        commits: commits.map((c) => ({
          sha: c.id,
          message: c.message,
          author: c.author?.name ?? "Unbekannt",
          url: c.url ?? null,
        })),
        branch,
        pusher: pusherName,
        repo: repoFullName,
      };

      await prisma.activityLog.create({
        data: {
          action: "pushed",
          entityType: "commit",
          entityId: kurzeCommitId,
          entityName: abgeschnitteneNachricht,
          projectId: projekt.id,
          userId: null, // Webhook hat keinen User-Kontext
          metadata: JSON.stringify(metadaten),
        },
      });
    }

    // ── 6. Projekt updatedAt aktualisieren (touch) ──────────────────────────
    await prisma.project.update({
      where: { id: projekt.id },
      data: { updatedAt: new Date() },
    });

    // ── 7. Erfolgsantwort ───────────────────────────────────────────────────
    return NextResponse.json(
      {
        received: true,
        project: projekt.name,
        commits: commits.length,
      },
      { status: 200 }
    );
  } catch (fehler) {
    console.error("[GitHub Webhook] Unerwarteter Fehler:", fehler);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
