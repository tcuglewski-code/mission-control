/**
 * Cron: Cleanup PD Access Logs (Sprint DA-29)
 * Löscht Access-Log-Einträge älter als 90 Tage
 * 
 * Schedule: Täglich um 3:00 UTC (via Vercel Cron)
 */

import { NextResponse } from 'next/server'
import { cleanupPdAccessLogs } from '@/lib/pd-access-log'

export const dynamic = 'force-dynamic'

// Vercel Cron Authorization
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  // Vercel Cron sends this header
  if (request.headers.get('x-vercel-cron') === 'true') {
    return true
  }
  
  // Manual trigger with secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  return false
}

export async function GET(request: Request) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] cleanup-pd-access-log: Starting...')
    const startTime = Date.now()

    // Run cleanup (90 days retention)
    const result = await cleanupPdAccessLogs()

    const duration = Date.now() - startTime
    console.log(`[CRON] cleanup-pd-access-log: Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      retentionDays: 90,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] cleanup-pd-access-log: Error:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
