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
    if (puffer1.length !== puffer2.length) return false;
    return timingSafeEqual(puffer1, puffer2);
  } catch {
    return false;
  }
}

// ─── Task-Referenzen aus Commit-Message extrahieren ──────────────────────────

/**
 * Sucht nach Task-Referenzen in einer Commit-Message:
 * - cuid-Muster: 20+ Kleinbuchstaben/Ziffern (z.B. cuid2-IDs)
 * - Kurz-SHA oder numerische IDs werden ignoriert
 *
 * Gibt eine Liste potenzieller Task-IDs zurück.
 */
function extrahiereTaskReferenzen(commitMessage: string): string[] {
  const gefundeneIds: string[] = []

  // Muster 1: Explizite Referenz "task:CUID" oder "task: CUID"
  const taskPraefixMuster = /\btask[:\s]+([a-z0-9]{20,})\b/gi
  let treffer: RegExpExecArray | null
  while ((treffer = taskPraefixMuster.exec(commitMessage)) !== null) {
    gefundeneIds.push(treffer[1])
  }

  // Muster 2: Rohe cuid (20+ Zeichen, nur Kleinbuchstaben + Ziffern) — typisches cuid2-Format
  const cuidMuster = /\b([a-z][a-z0-9]{19,})\b/g
  while ((treffer = cuidMuster.exec(commitMessage)) !== null) {
    if (!gefundeneIds.includes(treffer[1])) {
      gefundeneIds.push(treffer[1])
    }
  }

  // Duplikate entfernen
  return [...new Set(gefundeneIds)]
}

// ─── Haupthandler für POST /api/webhooks/github ───────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const roherBody = await req.text();

    // ── 1. Signatur prüfen ──────────────────────────────────────────────────
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const signaturHeader = req.headers.get("x-hub-signature-256");

    if (webhookSecret) {
      if (!signaturHeader) {
        console.error("[GitHub Webhook] Fehlender x-hub-signature-256 Header");
        return NextResponse.json({ error: "Signatur fehlt" }, { status: 401 });
      }
      if (!verifizierungSignatur(roherBody, signaturHeader, webhookSecret)) {
        console.error("[GitHub Webhook] Ungültige Signatur");
        return NextResponse.json({ error: "Ungültige Signatur" }, { status: 401 });
      }
    } else {
      console.warn("[GitHub Webhook] GITHUB_WEBHOOK_SECRET nicht gesetzt — Dev-Modus, Signatur wird nicht geprüft");
    }

    // ── 2. Event-Typ prüfen ─────────────────────────────────────────────────
    const eventTyp = req.headers.get("x-github-event");
    if (eventTyp !== "push") {
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
      console.warn(`[GitHub Webhook] Kein Projekt für Repo '${repoFullName}' gefunden`);
      return NextResponse.json({ received: true, message: "Kein passendes Projekt gefunden" }, { status: 200 });
    }

    // ── 5. Mehrere ActivityLog-Einträge erstellen (bis zu 5 Commits) ─────────
    const relevanteCommits = commits.slice(0, 5);
    let erstellteEintraege = 0;
    let taskKommentare = 0;

    if (relevanteCommits.length > 0) {
      // Alle Commits als ActivityLog-Einträge (bulk insert)
      await prisma.activityLog.createMany({
        data: relevanteCommits.map((commit) => ({
          action: "github_commit",
          entityType: "commit",
          entityId: commit.id.substring(0, 7),
          entityName: commit.message.split("\n")[0].substring(0, 120),
          projectId: projekt.id,
          userId: null, // Webhook hat keinen User-Kontext
          metadata: JSON.stringify({
            sha: commit.id,
            author: commit.author?.name ?? "Unbekannt",
            url: commit.url ?? null,
            repo: repoFullName,
            branch,
            pusher: pusherName,
          }),
        })),
      });
      erstellteEintraege = relevanteCommits.length;

      // ── 6. Task-Referenzen in Commit-Messages suchen ─────────────────────
      for (const commit of relevanteCommits) {
        const potenzielleIds = extrahiereTaskReferenzen(commit.message);

        for (const taskId of potenzielleIds) {
          try {
            // Task in der DB suchen (nur Tasks im selben Projekt, Sicherheitscheck)
            const task = await prisma.task.findFirst({
              where: {
                id: taskId,
                projectId: projekt.id,
              },
            });

            if (task) {
              // TaskComment erstellen: Commit-Info als Kommentar am Task
              const commitKurzSha = commit.id.substring(0, 7);
              const commitErsteZeile = commit.message.split("\n")[0];

              await prisma.taskComment.create({
                data: {
                  taskId: task.id,
                  authorId: null, // Kein User-Kontext bei Webhook
                  content: [
                    `🔗 **GitHub Commit referenziert diesen Task**`,
                    ``,
                    `**Commit:** [\`${commitKurzSha}\`](${commit.url ?? "#"})`,
                    `**Nachricht:** ${commitErsteZeile}`,
                    `**Autor:** ${commit.author?.name ?? "Unbekannt"}`,
                    `**Branch:** ${branch}`,
                    `**Repo:** ${repoFullName}`,
                  ].join("\n"),
                },
              });

              taskKommentare++;
              console.log(
                `[GitHub Webhook] Commit ${commitKurzSha} → TaskComment für Task ${task.id} (${task.title}) erstellt`
              );
            }
          } catch (fehler) {
            // Einzelner Task-Fehler soll nicht den gesamten Webhook abbrechen
            console.error(`[GitHub Webhook] Fehler beim Erstellen des TaskComments für ID ${taskId}:`, fehler);
          }
        }
      }
    }

    // ── 7. Projekt updatedAt aktualisieren (touch) ──────────────────────────
    await prisma.project.update({
      where: { id: projekt.id },
      data: { updatedAt: new Date() },
    });

    // ── 8. Erfolgsantwort ───────────────────────────────────────────────────
    return NextResponse.json(
      {
        received: true,
        project: projekt.name,
        commits: commits.length,
        aktivitaetseintraege: erstellteEintraege,
        taskKommentare,
      },
      { status: 200 }
    );
  } catch (fehler) {
    console.error("[GitHub Webhook] Unerwarteter Fehler:", fehler);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
