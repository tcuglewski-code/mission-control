'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  TrendingUp,
  Users,
  ListTodo,
  Cpu,
  Sparkles,
  Settings,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  RefreshCw
} from 'lucide-react'

interface UpsellTrigger {
  id: string
  tenantId: string
  tenantName: string
  triggerType: string
  triggerValue: number
  threshold: number
  suggestedPlan: string
  message: string
  status: string
  priority: string
  notes?: string
  createdAt: string
  contactedAt?: string
  convertedAt?: string
}

interface Config {
  enabled: boolean
  userThreshold: number
  taskMonthlyThreshold: number
  apiCostThreshold: number
  storageThreshold: number
  cooldownDays: number
  alertTelegram: boolean
  alertEmail: boolean
}

interface Stats {
  total: number
  new: number
  contacted: number
  converted: number
  dismissed: number
  highPriority: number
}

export default function UpsellingPage() {
  const [triggers, setTriggers] = useState<UpsellTrigger[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [conversionRate, setConversionRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedTrigger, setSelectedTrigger] = useState<UpsellTrigger | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/upselling')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTriggers(data.triggers)
      setConfig(data.config)
      setStats(data.stats)
      setConversionRate(data.conversionRate)
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateTriggerStatus = async (triggerId: string, status: string, notes?: string) => {
    try {
      const res = await fetch(`/api/upselling/${triggerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })
      if (res.ok) {
        fetchData()
        setSelectedTrigger(null)
      }
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  const saveConfig = async () => {
    if (!config) return
    try {
      const res = await fetch('/api/upselling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        setSettingsOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Save config error:', error)
    }
  }

  const runManualCheck = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cron/upsell-check', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`
        }
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Check abgeschlossen: ${result.triggersFound} neue Trigger gefunden`)
        fetchData()
      }
    } catch (error) {
      console.error('Manual check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTriggers = triggers.filter(t => {
    if (filter === 'all') return true
    if (filter === 'new') return t.status === 'new'
    if (filter === 'high') return t.priority === 'high' && t.status === 'new'
    if (filter === 'contacted') return t.status === 'contacted'
    if (filter === 'closed') return ['converted', 'dismissed'].includes(t.status)
    return true
  })

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'users': return <Users className="h-4 w-4" />
      case 'tasks': return <ListTodo className="h-4 w-4" />
      case 'api_cost': return <Cpu className="h-4 w-4" />
      case 'feature_request': return <Sparkles className="h-4 w-4" />
      default: return <TrendingUp className="h-4 w-4" />
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'custom': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Neu</Badge>
      case 'contacted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Kontaktiert</Badge>
      case 'converted':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Konvertiert</Badge>
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Verworfen</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#2C3A1C]" />
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3A1C]">Upselling Dashboard</h1>
          <p className="text-muted-foreground">Automatische Upgrade-Chancen erkennen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runManualCheck} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Jetzt prüfen
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Einstellungen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upselling Konfiguration</DialogTitle>
              </DialogHeader>
              {config && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label>Upselling aktiv</Label>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nutzer-Schwellwert (Pro ab...)</Label>
                    <Input
                      type="number"
                      value={config.userThreshold}
                      onChange={(e) => setConfig({ ...config, userThreshold: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tasks/Monat Schwellwert</Label>
                    <Input
                      type="number"
                      value={config.taskMonthlyThreshold}
                      onChange={(e) => setConfig({ ...config, taskMonthlyThreshold: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API-Kosten Schwellwert (USD)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.apiCostThreshold}
                      onChange={(e) => setConfig({ ...config, apiCostThreshold: parseFloat(e.target.value) || 20 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown (Tage)</Label>
                    <Input
                      type="number"
                      value={config.cooldownDays}
                      onChange={(e) => setConfig({ ...config, cooldownDays: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Telegram-Alerts</Label>
                    <Switch
                      checked={config.alertTelegram}
                      onCheckedChange={(alertTelegram) => setConfig({ ...config, alertTelegram })}
                    />
                  </div>
                  <Button className="w-full bg-[#2C3A1C]" onClick={saveConfig}>
                    Speichern
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Neue Chancen</div>
              <div className="text-2xl font-bold">{stats.new}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">High Priority</div>
              <div className="text-2xl font-bold">{stats.highPriority}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Kontaktiert</div>
              <div className="text-2xl font-bold">{stats.contacted}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Konvertiert</div>
              <div className="text-2xl font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold">{conversionRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Alle' },
          { value: 'new', label: 'Neu' },
          { value: 'high', label: 'High Priority' },
          { value: 'contacted', label: 'Kontaktiert' },
          { value: 'closed', label: 'Abgeschlossen' }
        ].map(tab => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(tab.value)}
            className={filter === tab.value ? 'bg-[#2C3A1C]' : ''}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Triggers List */}
      <Card>
        <CardHeader>
          <CardTitle>Upselling Trigger ({filteredTriggers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTriggers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Trigger in dieser Kategorie
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTriggers.map(trigger => (
                <div
                  key={trigger.id}
                  className={`p-4 rounded-lg border ${
                    trigger.priority === 'high' && trigger.status === 'new'
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#2C3A1C]/10 text-[#2C3A1C]">
                        {getTriggerIcon(trigger.triggerType)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {trigger.tenantName}
                          {trigger.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">High</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trigger.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(trigger.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanBadgeColor(trigger.suggestedPlan)}>
                        {trigger.suggestedPlan.toUpperCase()}
                      </Badge>
                      {getStatusBadge(trigger.status)}
                    </div>
                  </div>

                  {/* Actions */}
                  {trigger.status === 'new' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTriggerStatus(trigger.id, 'contacted')}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Kontaktiert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600"
                        onClick={() => updateTriggerStatus(trigger.id, 'converted')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Konvertiert
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-500"
                            onClick={() => setSelectedTrigger(trigger)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Verwerfen
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Trigger verwerfen</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Label>Grund (optional)</Label>
                            <Textarea
                              placeholder="Warum wird dieser Trigger nicht weiterverfolgt?"
                              onChange={(e) => {
                                if (selectedTrigger) {
                                  setSelectedTrigger({ ...selectedTrigger, notes: e.target.value })
                                }
                              }}
                            />
                            <Button
                              className="w-full"
                              onClick={() => {
                                if (selectedTrigger) {
                                  updateTriggerStatus(selectedTrigger.id, 'dismissed', selectedTrigger.notes)
                                }
                              }}
                            >
                              Verwerfen
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {trigger.status === 'contacted' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600"
                        onClick={() => updateTriggerStatus(trigger.id, 'converted')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Konvertiert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-500"
                        onClick={() => updateTriggerStatus(trigger.id, 'dismissed')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Verwerfen
                      </Button>
                    </div>
                  )}

                  {trigger.notes && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <strong>Notizen:</strong> {trigger.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
