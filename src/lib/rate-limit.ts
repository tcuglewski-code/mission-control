/**
 * Rate-Limiter mit Upstash Redis Support (Sprint SC-02)
 *
 * Verwendet Upstash Redis wenn konfiguriert, sonst Fallback auf In-Memory.
 * 
 * Für Upstash: ENV-Variablen benötigt:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * In-Memory Hinweis: In serverlosen Umgebungen (z.B. Vercel Edge Functions) ist der
 * Speicher pro Instanz isoliert. Upstash bietet echtes verteiltes Rate-Limiting.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================
// Upstash Configuration
// ============================================

const isUpstashConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN

const redis = isUpstashConfigured 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Vorkonfigurierte Upstash Limiter
const upstashLimiters = redis ? {
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 req/min
    analytics: true,
    prefix: 'mc:ratelimit:api',
  }),
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),  // 10 req/15min
    analytics: true,
    prefix: 'mc:ratelimit:login',
  }),
  apiKey: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),  // 200 req/min
    analytics: true,
    prefix: 'mc:ratelimit:apikey',
  }),
} : null


// ============================================
// In-Memory Fallback
// ============================================

interface RateLimitEintrag {
  anzahl: number
  zuruecksetzenAm: number
}

const speicher = new Map<string, RateLimitEintrag>()
let letzterCleanup = Date.now()

function inMemoryRateLimit(schluessel: string, max: number, fensterMs: number): boolean {
  const jetzt = Date.now()

  // Lazy Cleanup: Alle 5 Minuten abgelaufene Einträge entfernen
  if (jetzt - letzterCleanup > 5 * 60 * 1000) {
    for (const [k, eintrag] of speicher.entries()) {
      if (eintrag.zuruecksetzenAm < jetzt) speicher.delete(k)
    }
    letzterCleanup = jetzt
  }

  const eintrag = speicher.get(schluessel)

  if (!eintrag || eintrag.zuruecksetzenAm < jetzt) {
    speicher.set(schluessel, { anzahl: 1, zuruecksetzenAm: jetzt + fensterMs })
    return true
  }

  if (eintrag.anzahl >= max) return false

  eintrag.anzahl++
  return true
}


// ============================================
// Unified Rate Limit Function
// ============================================

/**
 * Prüft ob eine Anfrage erlaubt ist (synchron für Middleware-Kompatibilität)
 * Nutzt In-Memory Fallback wenn Upstash nicht konfiguriert ist.
 * 
 * @param schluessel  Eindeutiger Schlüssel (z.B. "login:1.2.3.4" oder "api:1.2.3.4")
 * @param max         Maximale Anzahl Anfragen im Zeitfenster
 * @param fensterMs   Zeitfenster in Millisekunden
 * @returns true = erlaubt, false = gesperrt (Rate-Limit überschritten)
 */
export function rateLimit(schluessel: string, max: number, fensterMs: number): boolean {
  // In-Memory Fallback (synchron)
  return inMemoryRateLimit(schluessel, max, fensterMs)
}


/**
 * Async Rate-Limit Check mit Upstash (falls konfiguriert)
 * Sollte bevorzugt in API-Routen verwendet werden.
 */
export async function rateLimitAsync(
  ip: string, 
  type: 'api' | 'login' | 'apiKey' = 'api'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  
  // Mit Upstash
  if (upstashLimiters) {
    const limiter = upstashLimiters[type]
    const result = await limiter.limit(ip)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // Fallback auf In-Memory
  const configs = {
    api: { max: 100, window: 60000 },
    login: { max: 10, window: 900000 },
    apiKey: { max: 200, window: 60000 },
  }
  const config = configs[type]
  const key = `${type}:${ip}`
  const allowed = inMemoryRateLimit(key, config.max, config.window)
  
  return {
    success: allowed,
    limit: config.max,
    remaining: allowed ? config.max - 1 : 0,
    reset: Date.now() + config.window,
  }
}


/**
 * Status: Ist Upstash Rate-Limiting aktiv?
 */
export const isUpstashEnabled = isUpstashConfigured


/**
 * Rate-Limit Headers für Response
 */
export function rateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil((result.reset - Date.now()) / 1000)),
  }
}
