/**
 * 2FA Backup Codes API
 * POST: Generiert neue Backup-Codes
 * Sprint Q016: Two-Factor Authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateBackupCodes, hashBackupCode } from '@/lib/totp'
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
        error: '2FA muss zuerst aktiviert werden' 
      }, { status: 400 })
    }

    // Passwort verifizieren
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json({ 
        error: 'Falsches Passwort' 
      }, { status: 400 })
    }

    // Neue Backup-Codes generieren
    const backupCodes = generateBackupCodes(8)
    const hashedCodes = backupCodes.map(code => hashBackupCode(code))

    // Speichern
    await prisma.authUser.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: hashedCodes }
    })

    return NextResponse.json({
      success: true,
      message: 'Neue Backup-Codes generiert. Alte Codes sind ungültig.',
      backupCodes  // Nur einmalig anzeigen!
    })

  } catch (error) {
    console.error('2FA Backup Codes Error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
