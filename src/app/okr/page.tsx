"use client"

import { useState, useEffect } from "react"
import { Target, Plus, ChevronDown, ChevronRight, Trash2, Edit, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"

interface KeyResult {
  id: string
  title: string
  metric: string | null
  current: number
  target: number
  unit: string | null
  progress: number
}

interface Objective {
  id: string
  title: string
  description: string | null
  period: string
  deadline: string | null
  status: string
  progress: number
  projectId: string | null
  ownerId: string | null
  ownerName: string | null
  keyResults: KeyResult[]
}

const statusConfig = {
  "on-track": { label: "Auf Kurs", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400", bgLight: "bg-green-50 dark:bg-green-500/10", icon: TrendingUp },
  "at-risk": { label: "Gefährdet", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400", bgLight: "bg-amber-50 dark:bg-amber-500/10", icon: AlertTriangle },
  "off-track": { label: "Kritisch", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400", bgLight: "bg-red-50 dark:bg-red-500/10", icon: AlertTriangle },
  "completed": { label: "Abgeschlossen", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400", bgLight: "bg-blue-50 dark:bg-blue-500/10", icon: CheckCircle2 }
}

export default function OKRPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingKR, setEditingKR] = useState<{ objId: string; kr: KeyResult } | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")

  // New objective form
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPeriod, setNewPeriod] = useState(getCurrentQuarter())
  const [newOwner, setNewOwner] = useState("")

  // New KR form
  const [addingKRTo, setAddingKRTo] = useState<string | null>(null)
  const [newKRTitle, setNewKRTitle] = useState("")
  const [newKRTarget, setNewKRTarget] = useState("100")
  const [newKRUnit, setNewKRUnit] = useState("")

  useEffect(() => {
    fetchObjectives()
  }, [selectedPeriod])

  function getCurrentQuarter(): string {
    const now = new Date()
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    return `Q${quarter} ${now.getFullYear()}`
  }

  async function fetchObjectives() {
    try {
      const params = new URLSearchParams()
      if (selectedPeriod) params.set("period", selectedPeriod)
      
      const res = await fetch(`/api/okr?${params}`)
      if (res.ok) {
        const data = await res.json()
        setObjectives(data)
        // Auto-expand all by default
        setExpandedIds(new Set(data.map((o: Objective) => o.id)))
      }
    } catch (error) {
      console.error("Failed to fetch objectives:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createObjective() {
    if (!newTitle.trim()) return

    try {
      const res = await fetch("/api/okr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          period: newPeriod,
          ownerName: newOwner || null
        })
      })

      if (res.ok) {
        setShowNewForm(false)
        setNewTitle("")
        setNewDescription("")
        setNewOwner("")
        fetchObjectives()
      }
    } catch (error) {
      console.error("Failed to create objective:", error)
    }
  }

  async function deleteObjective(id: string) {
    if (!confirm("Objective und alle Key Results löschen?")) return

    try {
      await fetch(`/api/okr/${id}`, { method: "DELETE" })
      fetchObjectives()
    } catch (error) {
      console.error("Failed to delete objective:", error)
    }
  }

  async function addKeyResult(objectiveId: string) {
    if (!newKRTitle.trim()) return

    try {
      const res = await fetch(`/api/okr/${objectiveId}/key-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newKRTitle,
          target: parseFloat(newKRTarget) || 100,
          unit: newKRUnit || null,
          current: 0
        })
      })

      if (res.ok) {
        setAddingKRTo(null)
        setNewKRTitle("")
        setNewKRTarget("100")
        setNewKRUnit("")
        fetchObjectives()
      }
    } catch (error) {
      console.error("Failed to add key result:", error)
    }
  }

  async function updateKeyResultProgress(krId: string, current: number) {
    try {
      await fetch(`/api/okr/key-results/${krId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current })
      })
      fetchObjectives()
    } catch (error) {
      console.error("Failed to update key result:", error)
    }
  }

  async function deleteKeyResult(krId: string) {
    try {
      await fetch(`/api/okr/key-results/${krId}`, { method: "DELETE" })
      fetchObjectives()
    } catch (error) {
      console.error("Failed to delete key result:", error)
    }
  }

  function toggleExpand(id: string) {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  // Get unique periods for filter
  const periods = [...new Set(objectives.map(o => o.period))].sort().reverse()

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">OKR Dashboard</h1>
            <p className="text-sm text-muted-foreground">Objectives & Key Results</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Alle Perioden</option>
            {periods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neues Objective
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{objectives.length}</div>
          <div className="text-sm text-muted-foreground">Objectives</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {objectives.filter(o => o.status === "on-track").length}
          </div>
          <div className="text-sm text-muted-foreground">Auf Kurs</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">
            {objectives.filter(o => o.status === "at-risk").length}
          </div>
          <div className="text-sm text-muted-foreground">Gefährdet</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {objectives.filter(o => o.status === "completed").length}
          </div>
          <div className="text-sm text-muted-foreground">Abgeschlossen</div>
        </div>
      </div>

      {/* New Objective Form */}
      {showNewForm && (
        <div className="bg-card border rounded-lg p-4 mb-6 shadow-sm">
          <h3 className="font-semibold mb-3">Neues Objective erstellen</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Objective Titel *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Periode (z.B. Q2 2026)"
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Beschreibung (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Owner (optional)"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createObjective}
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 disabled:opacity-50"
            >
              Erstellen
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 border rounded-lg hover:bg-accent"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Objectives angelegt</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-3 text-foreground hover:underline"
          >
            Erstes Objective erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const status = statusConfig[obj.status as keyof typeof statusConfig] || statusConfig["on-track"]
            const StatusIcon = status.icon
            const isExpanded = expandedIds.has(obj.id)

            return (
              <div key={obj.id} className="bg-card border rounded-lg overflow-hidden">
                {/* Objective Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-accent"
                  onClick={() => toggleExpand(obj.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{obj.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgLight} ${status.textColor}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {status.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                            {obj.period}
                          </span>
                        </div>
                        {obj.description && (
                          <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {obj.ownerName && (
                        <span className="text-sm text-muted-foreground">{obj.ownerName}</span>
                      )}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">{obj.progress}%</div>
                        <div className="text-xs text-muted-foreground">{obj.keyResults.length} Key Results</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteObjective(obj.id)
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${status.color}`}
                      style={{ width: `${obj.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                {isExpanded && (
                  <div className="border-t bg-accent">
                    <div className="p-4 space-y-3">
                      {obj.keyResults.map((kr) => (
                        <div key={kr.id} className="bg-card p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{kr.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {kr.current} / {kr.target} {kr.unit || ""}
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {kr.progress}%
                              </span>
                              <button
                                onClick={() => deleteKeyResult(kr.id)}
                                className="p-1 text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {/* Progress Slider */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${kr.progress}%` }}
                              />
                            </div>
                            <input
                              type="number"
                              value={kr.current}
                              onChange={(e) => updateKeyResultProgress(kr.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm border rounded"
                              min={0}
                              max={kr.target}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Add Key Result Form */}
                      {addingKRTo === obj.id ? (
                        <div className="bg-card p-3 rounded-lg border border-dashed border-primary">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Key Result Titel *"
                              value={newKRTitle}
                              onChange={(e) => setNewKRTitle(e.target.value)}
                              className="col-span-3 px-3 py-2 border rounded text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Zielwert"
                              value={newKRTarget}
                              onChange={(e) => setNewKRTarget(e.target.value)}
                              className="px-3 py-2 border rounded text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Einheit (€, %, etc.)"
                              value={newKRUnit}
                              onChange={(e) => setNewKRUnit(e.target.value)}
                              className="px-3 py-2 border rounded text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => addKeyResult(obj.id)}
                                disabled={!newKRTitle.trim()}
                                className="flex-1 px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/80 disabled:opacity-50"
                              >
                                Hinzufügen
                              </button>
                              <button
                                onClick={() => setAddingKRTo(null)}
                                className="px-3 py-2 border rounded text-sm hover:bg-accent"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingKRTo(obj.id)}
                          className="w-full py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Key Result hinzufügen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
