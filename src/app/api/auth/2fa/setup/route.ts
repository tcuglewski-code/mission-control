/**
 * 2FA Setup API
 * POST: Generiert neues Secret und QR-Code
 * Sprint Q016: Two-Factor Authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSecret, generateQRCodeDataURL } from '@/lib/totp'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // User laden
    const user = await prisma.authUser.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, email: true, twoFactorEnabled: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Wenn bereits aktiviert, abbrechen
    if (user.twoFactorEnabled) {
      return NextResponse.json({ 
        error: 'Zwei-Faktor-Authentifizierung ist bereits aktiviert' 
      }, { status: 400 })
    }

    // Neues Secret generieren
    const secret = generateSecret()
    
    // Account-Name für QR-Code (Username oder Email)
    const accountName = user.email || user.username
    
    // QR-Code generieren
    const qrCodeDataURL = await generateQRCodeDataURL(secret, accountName)

    // Secret temporär speichern (noch nicht aktiviert)
    await prisma.authUser.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret }
    })

    return NextResponse.json({
      success: true,
      secret,  // Für manuelle Eingabe in Authenticator-App
      qrCode: qrCodeDataURL,
      message: 'Scannen Sie den QR-Code mit Ihrer Authenticator-App'
    })

  } catch (error) {
    console.error('2FA Setup Error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
