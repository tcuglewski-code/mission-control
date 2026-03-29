'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Server,
  Cloud,
  HardDrive,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface TenantStatus {
  tenantId: string
  tenantName: string
  backupType: string
  enabled: boolean
  schedule: string
  retentionDays: number
  lastBackupAt: string | null
  lastBackupStatus: string | null
  lastJobId?: string
  lastJobMetadata?: Record<string, unknown>
}

interface BackupJob {
  id: string
  tenantId: string
  tenantName: string
  backupType: string
  status: string
  startedAt: string | null
  completedAt: string | null
  duration: number | null
  error: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface BackupStats {
  totalTenants: number
  enabledTenants: number
  lastSuccessful: string | null
  lastFailed: string | null
  todayJobs: number
}

export default function BackupsPage() {
  const [tenants, setTenants] = useState<TenantStatus[]>([])
  const [recentJobs, setRecentJobs] = useState<BackupJob[]>([])
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/backups')
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants)
        setRecentJobs(data.recentJobs)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const runBackupNow = async () => {
    if (running) return
    setRunning(true)
    try {
      const res = await fetch('/api/cron/backup', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'manual-trigger', // Für manuellen Test
        },
      })
      if (res.ok) {
        // Reload data
        await fetchData()
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setRunning(false)
    }
  }

  const toggleTenant = async (tenantId: string, enabled: boolean) => {
    try {
      await fetch('/api/backups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, enabled }),
      })
      await fetchData()
    } catch (error) {
      console.error('Fehler:', error)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Erfolg</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fehler</Badge>
      case 'running':
        return <Badge className="bg-blue-600"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Läuft</Badge>
      case 'skipped':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Übersprungen</Badge>
      default:
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Ausstehend</Badge>
    }
  }

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'neon':
        return <Cloud className="w-4 h-4 text-blue-500" />
      case 'mysql':
        return <Server className="w-4 h-4 text-orange-500" />
      case 'wp-files':
        return <HardDrive className="w-4 h-4 text-purple-500" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-[#8a8a8a]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Lade Backup-Status...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3A1C] flex items-center gap-2">
            <Database className="w-6 h-6" />
            Backup-Management
          </h1>
          <p className="text-[#8a8a8a] mt-1">
            Überwachung und Verwaltung aller Tenant-Backups
          </p>
        </div>
        <Button
          onClick={runBackupNow}
          disabled={running}
          className="bg-[#2C3A1C] hover:bg-[#3d4f28]"
        >
          {running ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Läuft...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Backup jetzt ausführen</>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[#d4c8a8]">
            <CardHeader className="pb-2">
              <CardDescription>Tenants</CardDescription>
              <CardTitle className="text-2xl text-[#2C3A1C]">
                {stats.enabledTenants} / {stats.totalTenants}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8a8a8a]">Backups aktiviert</p>
            </CardContent>
          </Card>

          <Card className="border-[#d4c8a8]">
            <CardHeader className="pb-2">
              <CardDescription>Heute ausgeführt</CardDescription>
              <CardTitle className="text-2xl text-[#2C3A1C]">
                {stats.todayJobs}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8a8a8a]">Backup-Jobs</p>
            </CardContent>
          </Card>

          <Card className="border-[#d4c8a8]">
            <CardHeader className="pb-2">
              <CardDescription>Letzter Erfolg</CardDescription>
              <CardTitle className="text-lg text-green-600">
                {stats.lastSuccessful
                  ? formatDistanceToNow(new Date(stats.lastSuccessful), { locale: de, addSuffix: true })
                  : '–'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8a8a8a]">
                {stats.lastSuccessful
                  ? format(new Date(stats.lastSuccessful), 'dd.MM.yyyy HH:mm', { locale: de })
                  : 'Noch kein Backup'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#d4c8a8]">
            <CardHeader className="pb-2">
              <CardDescription>Letzter Fehler</CardDescription>
              <CardTitle className="text-lg text-red-600">
                {stats.lastFailed
                  ? formatDistanceToNow(new Date(stats.lastFailed), { locale: de, addSuffix: true })
                  : 'Keiner'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8a8a8a]">
                {stats.lastFailed
                  ? format(new Date(stats.lastFailed), 'dd.MM.yyyy HH:mm', { locale: de })
                  : 'Alles OK'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenant Status */}
      <Card className="border-[#d4c8a8]">
        <CardHeader>
          <CardTitle className="text-[#2C3A1C]">Tenant-Übersicht</CardTitle>
          <CardDescription>Backup-Status aller Datenbanken und Systeme</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Letztes Backup</TableHead>
                <TableHead>Zeitplan</TableHead>
                <TableHead>Aktiviert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.tenantId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getBackupTypeIcon(tenant.backupType)}
                      <div>
                        <div className="font-medium">{tenant.tenantName}</div>
                        <div className="text-xs text-[#8a8a8a]">{tenant.tenantId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {tenant.backupType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(tenant.lastBackupStatus)}
                  </TableCell>
                  <TableCell>
                    {tenant.lastBackupAt ? (
                      <div>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(tenant.lastBackupAt), { locale: de, addSuffix: true })}
                        </div>
                        <div className="text-xs text-[#8a8a8a]">
                          {format(new Date(tenant.lastBackupAt), 'dd.MM. HH:mm', { locale: de })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#8a8a8a]">Noch nie</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {tenant.schedule}
                    </Badge>
                    <span className="text-xs text-[#8a8a8a] ml-2">
                      ({tenant.retentionDays}d)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={tenant.enabled}
                      onCheckedChange={(checked) => toggleTenant(tenant.tenantId, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card className="border-[#d4c8a8]">
        <CardHeader>
          <CardTitle className="text-[#2C3A1C]">Letzte Backup-Jobs</CardTitle>
          <CardDescription>Historie der letzten 20 Backup-Ausführungen</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[#8a8a8a] py-8">
                    Noch keine Backup-Jobs ausgeführt
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {format(new Date(job.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </div>
                        <div className="text-xs text-[#8a8a8a]">
                          {formatDistanceToNow(new Date(job.createdAt), { locale: de, addSuffix: true })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getBackupTypeIcon(job.backupType)}
                        {job.tenantName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      {job.duration !== null ? `${job.duration}s` : '–'}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {job.error ? (
                        <span className="text-red-600 text-xs">{job.error}</span>
                      ) : job.metadata ? (
                        <span className="text-xs text-[#8a8a8a]">
                          {typeof job.metadata === 'object' && 'note' in job.metadata
                            ? String(job.metadata.note)
                            : JSON.stringify(job.metadata).slice(0, 50)}
                        </span>
                      ) : (
                        '–'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-[#d4c8a8] bg-[#f5f0e1]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertTriangle className="w-5 h-5 text-[#c9a227] shrink-0 mt-0.5" />
            <div className="text-sm text-[#5a5a5a]">
              <p className="font-medium mb-2">Backup-Strategie</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Neon (PostgreSQL):</strong> Automatisches Point-in-Time Recovery (PITR) durch Neon, bis zu 7 Tage</li>
                <li><strong>WordPress (Hostinger):</strong> Tägliche automatische Backups durch Hostinger, 30 Tage Retention</li>
                <li><strong>Cron-Job:</strong> Täglich 04:00 Uhr Berlin — prüft Erreichbarkeit und loggt Status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
