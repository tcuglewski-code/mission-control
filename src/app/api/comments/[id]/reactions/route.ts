import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

const ALLOWED_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🚀"];

// POST /api/comments/[id]/reactions — Reaktion hinzufügen (Toggle)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: commentId } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Ungültiges Emoji. Erlaubt: ${ALLOWED_EMOJIS.join(" ")}` },
        { status: 400 }
      );
    }

    // Kommentar existiert?
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
    }

    // Toggle: existiert bereits → löschen, sonst anlegen
    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId: user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true, emoji });
    }

    const reaction = await prisma.commentReaction.create({
      data: {
        commentId,
        userId: user.id,
        emoji,
      },
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (err) {
    console.error("[POST /api/comments/[id]/reactions]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/comments/[id]/reactions — Reaktion entfernen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: commentId } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: "Emoji erforderlich" }, { status: 400 });
    }

    await prisma.commentReaction.deleteMany({
      where: {
        commentId,
        userId: user.id,
        emoji,
      },
    });

    return NextResponse.json({ removed: true });
  } catch (err) {
    console.error("[DELETE /api/comments/[id]/reactions]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
