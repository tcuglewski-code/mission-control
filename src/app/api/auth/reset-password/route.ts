import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token und Passwort sind erforderlich." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Der Link ist ungültig oder abgelaufen." }, { status: 400 })
    }

    const user = await prisma.authUser.findFirst({ where: { email: resetToken.email, active: true } })

    if (!user) {
      return NextResponse.json({ error: "Der Link ist ungültig oder abgelaufen." }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.authUser.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })

    return NextResponse.json({ message: "Passwort erfolgreich zurückgesetzt." })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 })
  }
}
