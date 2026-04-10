import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Benutzername und Passwort erforderlich' }, { status: 400 })
    }

    const user = await prisma.authUser.findUnique({
      where: { username },
      select: { id: true, passwordHash: true, active: true, twoFactorEnabled: true }
    })

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    return NextResponse.json({ success: true, requiresTwoFactor: user.twoFactorEnabled })

  } catch (error) {
    console.error('2FA Check Error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
