import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET: Backup-Übersicht (Configs + letzte Jobs)
export async function GET(request: NextRequest) {
  const auth = await getSessionOrApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }
  
  // Nur Admins dürfen Backups sehen
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const tenantId = searchParams.get('tenantId')
  const limit = parseInt(searchParams.get('limit') || '50')
  
  // Alle Configs laden
  const configs = await prisma.backupConfig.findMany({
    orderBy: { tenantName: 'asc' },
  })
  
  // Letzte Jobs pro Tenant laden (oder gefiltert)
  const jobsWhere = tenantId ? { tenantId } : {}
  const recentJobs = await prisma.backupJob.findMany({
    where: jobsWhere,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  
  // Statistiken
  const stats = {
    totalTenants: configs.length,
    enabledTenants: configs.filter(c => c.enabled).length,
    lastSuccessful: recentJobs.find(j => j.status === 'success')?.completedAt,
    lastFailed: recentJobs.find(j => j.status === 'failed')?.completedAt,
    todayJobs: recentJobs.filter(j => {
      const today = new Date()
      const jobDate = new Date(j.createdAt)
      return jobDate.toDateString() === today.toDateString()
    }).length,
  }
  
  // Tenant-Status Übersicht
  const tenantStatus = configs.map(config => {
    const lastJob = recentJobs.find(j => j.tenantId === config.tenantId)
    return {
      tenantId: config.tenantId,
      tenantName: config.tenantName,
      backupType: config.backupType,
      enabled: config.enabled,
      schedule: config.schedule,
      retentionDays: config.retentionDays,
      lastBackupAt: config.lastBackupAt,
      lastBackupStatus: config.lastBackupStatus,
      lastJobId: lastJob?.id,
      lastJobMetadata: lastJob?.metadata,
    }
  })
  
  return NextResponse.json({
    stats,
    tenants: tenantStatus,
    recentJobs: recentJobs.slice(0, 20),
  })
}

// PATCH: Config aktualisieren (enable/disable)
export async function PATCH(request: NextRequest) {
  const auth = await getSessionOrApiKey(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }
  
  const body = await request.json()
  const { tenantId, enabled, schedule, retentionDays } = body
  
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId erforderlich' }, { status: 400 })
  }
  
  const updated = await prisma.backupConfig.update({
    where: { tenantId },
    data: {
      ...(enabled !== undefined && { enabled }),
      ...(schedule && { schedule }),
      ...(retentionDays && { retentionDays }),
    },
  })
  
  return NextResponse.json({ success: true, config: updated })
}
