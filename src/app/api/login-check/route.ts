import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let step = 'init'
  try {
    step = 'parse'
    const body = await req.json()
    const { username, password } = body
    if (!username || !password) {
      return NextResponse.json({ error: 'Benutzername und Passwort erforderlich' }, { status: 400 })
    }
    step = 'db'
    const user = await prisma.authUser.findUnique({
      where: { username },
      select: { id: true, passwordHash: true, active: true, twoFactorEnabled: true }
    })
    step = 'usercheck'
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }
    step = 'bcrypt'
    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }
    return NextResponse.json({ success: true, requiresTwoFactor: user.twoFactorEnabled })
  } catch (e) {
    const err = e as any
    return NextResponse.json({ 
      error: 'Interner Serverfehler',
      step,
      errMsg: String(err?.message ?? 'unknown'),
      errType: String(err?.constructor?.name ?? typeof e),
      errCode: String(err?.code ?? 'none')
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ version: "debug-v3-11b9376", ts: Date.now() })
}
