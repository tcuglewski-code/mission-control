/**
 * 2FA Disable API
 * POST: Deaktiviert 2FA nach Passwort-Bestätigung
 * Sprint Q016: Two-Factor Authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 })
    }

    // User laden
    const user = await prisma.authUser.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        passwordHash: true,
        twoFactorEnabled: true 
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: '2FA ist nicht aktiviert' 
      }, { status: 400 })
    }

    // Passwort verifizieren
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json({ 
        error: 'Falsches Passwort' 
      }, { status: 400 })
    }

    // 2FA deaktivieren
    await prisma.authUser.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorVerifiedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Zwei-Faktor-Authentifizierung wurde deaktiviert'
    })

  } catch (error) {
    console.error('2FA Disable Error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
