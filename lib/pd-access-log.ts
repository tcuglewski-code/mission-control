/**
 * PD Access Logging (Sprint DA-29)
 * DSGVO-konforme Protokollierung aller Zugriffe auf personenbezogene Daten
 * Retention: 90 Tage (automatische Löschung via Cron)
 */

import { prisma } from './prisma'

// Ressourcen-Typen für personenbezogene Daten (Mission Control)
export type PdResource =
  | 'USER_PROFILE'      // User-Profil (Name, Email, etc.)
  | 'AUTH_USER'         // AuthUser (Login-Daten)
  | 'INVOICE'           // Rechnungen
  | 'EXPENSE'           // Ausgaben
  | 'DEAL'              // Sales Deals (Kundendaten)
  | 'MEETING'           // Meeting-Teilnehmer
  | 'API_KEY'           // API-Keys (sensibel)
  | 'ONBOARDING'        // Customer Onboarding

// Aktions-Typen
export type PdAction =
  | 'READ'              // Einzelnes Objekt lesen
  | 'BULK_READ'         // Liste/Suche
  | 'WRITE'             // Erstellen oder Aktualisieren
  | 'DELETE'            // Löschen
  | 'EXPORT'            // Export (z.B. PDF, CSV)

interface LogPdAccessParams {
  userId?: string | null
  userName?: string | null
  resource: PdResource
  resourceId?: string | null
  action: PdAction
  ip?: string | null
  userAgent?: string | null
  endpoint?: string | null
  method?: string | null
  statusCode?: number | null
  metadata?: Record<string, unknown> | null
}

/**
 * Protokolliert einen Zugriff auf personenbezogene Daten
 * Non-blocking: Fehler werden geloggt, aber nicht geworfen
 */
export async function logPdAccess(params: LogPdAccessParams): Promise<void> {
  try {
    await prisma.pdAccessLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName ?? null,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        action: params.action,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        endpoint: params.endpoint ?? null,
        method: params.method ?? null,
        statusCode: params.statusCode ?? null,
        metadata: params.metadata ?? undefined,
      },
    })
  } catch (error) {
    // Non-blocking: Log to console but don't throw
    console.error('[PD-ACCESS-LOG] Failed to log access:', error)
  }
}

/**
 * Hilfsfunktion: Extrahiert IP und User-Agent aus Request Headers
 */
export function extractRequestInfo(request: Request): {
  ip: string | null
  userAgent: string | null
} {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             null
  const userAgent = request.headers.get('user-agent') || null
  
  return { ip, userAgent }
}

/**
 * Retention Cleanup: Löscht Einträge älter als 90 Tage
 * Wird via Cron aufgerufen
 */
export async function cleanupPdAccessLogs(): Promise<{ deleted: number }> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  const result = await prisma.pdAccessLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  console.log(`[PD-ACCESS-LOG] Cleanup: ${result.count} entries deleted (older than ${cutoffDate.toISOString()})`)
  
  return { deleted: result.count }
}
