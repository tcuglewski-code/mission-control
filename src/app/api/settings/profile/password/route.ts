import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

/**
 * PATCH /api/settings/profile/password
 * Change current user's password.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Aktuelles und neues Passwort erforderlich" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Neues Passwort muss mindestens 8 Zeichen lang sein" },
      { status: 400 }
    );
  }

  const user = await prisma.authUser.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.authUser.update({
    where: { id: session.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true, message: "Passwort erfolgreich geändert" });
}
