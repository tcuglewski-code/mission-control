/**
 * 2FA TOTP Library
 * Sprint Q016: Two-Factor Authentication für Mission Control
 */
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import crypto from 'crypto'

const ISSUER = 'MissionControl'
const ALGORITHM = 'SHA1'
const DIGITS = 6
const PERIOD = 30

/**
 * Generiert ein neues TOTP-Secret
 */
export function generateSecret(): string {
  // 20 Bytes = 160 Bits, Standard für TOTP
  const bytes = crypto.randomBytes(20)
  return OTPAuth.Secret.fromUInt8Array(bytes).base32
}

/**
 * Erstellt ein TOTP-Objekt aus einem Secret
 */
function createTOTP(secret: string, accountName: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
}

/**
 * Generiert eine otpauth:// URI für QR-Codes
 */
export function generateOTPAuthURI(secret: string, accountName: string): string {
  const totp = createTOTP(secret, accountName)
  return totp.toString()
}

/**
 * Generiert einen QR-Code als Data-URL
 */
export async function generateQRCodeDataURL(secret: string, accountName: string): Promise<string> {
  const uri = generateOTPAuthURI(secret, accountName)
  return await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 256,
    margin: 2,
  })
}

/**
 * Verifiziert einen TOTP-Token
 * Erlaubt einen Zeitfenster-Drift von ±1 Periode (30 Sekunden)
 */
export function verifyToken(secret: string, token: string): boolean {
  const totp = createTOTP(secret, 'verification')
  // Delta von 1 erlaubt ±30 Sekunden Toleranz
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

/**
 * Generiert Backup-Codes (8 Codes à 8 Zeichen)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX (leicht lesbar)
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

/**
 * Hasht einen Backup-Code für sichere Speicherung
 */
export function hashBackupCode(code: string): string {
  // Normalisiere: Entferne Bindestriche und lowercase
  const normalized = code.replace(/-/g, '').toLowerCase()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Verifiziert einen Backup-Code gegen gehashte Codes
 * Gibt den Index des verwendeten Codes zurück oder -1 wenn ungültig
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const inputHash = hashBackupCode(code)
  return hashedCodes.findIndex(hash => hash === inputHash)
}
