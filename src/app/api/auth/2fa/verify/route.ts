/**
 * 2FA Verify API
 * POST: Verifiziert TOTP-Token und aktiviert 2FA
 * Sprint Q016: Two-Factor Authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyToken, generateBackupCodes, hashBackupCode } from '@/lib/totp'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 })
    }

    // User mit Secret laden
    const user = await prisma.authUser.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        twoFactorSecret: true, 
        twoFactorEnabled: true 
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ 
        error: 'Bitte zuerst 2FA-Setup starten' 
      }, { status: 400 })
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: '2FA ist bereits aktiviert' 
      }, { status: 400 })
    }

    // Token verifizieren
    const isValid = verifyToken(user.twoFactorSecret, token)

    if (!isValid) {
      return NextResponse.json({ 
        error: 'Ungültiger Code. Bitte erneut versuchen.' 
      }, { status: 400 })
    }

    // Backup-Codes generieren und hashen
    const backupCodes = generateBackupCodes(8)
    const hashedCodes = backupCodes.map(code => hashBackupCode(code))

    // 2FA aktivieren
    await prisma.authUser.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
        twoFactorVerifiedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert',
      backupCodes  // Nur einmalig anzeigen!
    })

  } catch (error) {
    console.error('2FA Verify Error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
