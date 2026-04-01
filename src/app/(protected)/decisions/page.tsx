'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ExternalLink,
  Undo2,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Decision {
  id: string
  title: string
  decisionDate: string
  context: string | null
  decision: string
  alternatives: string | null
  impact: string | null
  category: string
  status: string
  ownerId: string | null
  ownerName: string | null
  projectId: string | null
  projectName: string | null
  tags: string | null
  supersededBy: string | null
  reversedReason: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'all', label: 'Alle Kategorien' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Business', label: 'Business' },
  { value: 'Product', label: 'Product' },
  { value: 'Prozess', label: 'Prozess' },
  { value: 'Team', label: 'Team' },
  { value: 'Sonstiges', label: 'Sonstiges' },
]

const STATUSES = [
  { value: 'all', label: 'Alle Status' },
  { value: 'active', label: 'Aktiv' },
  { value: 'superseded', label: 'Ersetzt' },
  { value: 'reversed', label: 'Aufgehoben' },
]

const categoryColors: Record<string, string> = {
  Tech: 'bg-blue-100 text-blue-700',
  Business: 'bg-green-100 text-green-700',
  Product: 'bg-purple-100 text-purple-700',
  Prozess: 'bg-amber-100 text-amber-700',
  Team: 'bg-pink-100 text-pink-700',
  Sonstiges: 'bg-gray-100 text-gray-700',
}

const statusColors: Record<string, string> = {
  active: 'bg-[#2C3A1C] text-[#C9A227]',
  superseded: 'bg-gray-200 text-gray-600',
  reversed: 'bg-red-100 text-red-600',
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formContext, setFormContext] = useState('')
  const [formDecision, setFormDecision] = useState('')
  const [formAlternatives, setFormAlternatives] = useState('')
  const [formImpact, setFormImpact] = useState('')
  const [formCategory, setFormCategory] = useState('Tech')
  const [formOwnerName, setFormOwnerName] = useState('')
  const [formProjectName, setFormProjectName] = useState('')
  const [formTags, setFormTags] = useState('')

  const fetchDecisions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    if (status !== 'all') params.set('status', status)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/decisions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDecisions(data)
      }
    } catch (error) {
      console.error('Error fetching decisions:', error)
    } finally {
      setLoading(false)
    }
  }, [category, status, search])

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  const openCreateModal = () => {
    setEditingDecision(null)
    setFormTitle('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormContext('')
    setFormDecision('')
    setFormAlternatives('')
    setFormImpact('')
    setFormCategory('Tech')
    setFormOwnerName('')
    setFormProjectName('')
    setFormTags('')
    setShowModal(true)
  }

  const openEditModal = (d: Decision) => {
    setEditingDecision(d)
    setFormTitle(d.title)
    setFormDate(d.decisionDate.split('T')[0])
    setFormContext(d.context || '')
    setFormDecision(d.decision)
    setFormAlternatives(d.alternatives || '')
    setFormImpact(d.impact || '')
    setFormCategory(d.category)
    setFormOwnerName(d.ownerName || '')
    setFormProjectName(d.projectName || '')
    setFormTags(d.tags || '')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formDecision.trim()) {
      alert('Titel und Entscheidung sind Pflichtfelder')
      return
    }

    const payload = {
      title: formTitle,
      decisionDate: formDate,
      context: formContext || null,
      decision: formDecision,
      alternatives: formAlternatives || null,
      impact: formImpact || null,
      category: formCategory,
      ownerName: formOwnerName || null,
      projectName: formProjectName || null,
      tags: formTags || null,
    }

    try {
      if (editingDecision) {
        const res = await fetch(`/api/decisions/${editingDecision.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setShowModal(false)
          fetchDecisions()
        }
      } else {
        const res = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setShowModal(false)
          fetchDecisions()
        }
      }
    } catch (error) {
      console.error('Error saving decision:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Diese Entscheidung wirklich archivieren?')) return
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchDecisions()
      }
    } catch (error) {
      console.error('Error deleting decision:', error)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string, reversedReason?: string) => {
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reversedReason }),
      })
      if (res.ok) {
        fetchDecisions()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Stats
  const activeCount = decisions.filter((d) => d.status === 'active').length
  const supersededCount = decisions.filter((d) => d.status === 'superseded').length
  const reversedCount = decisions.filter((d) => d.status === 'reversed').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2C3A1C] rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#C9A227]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Decisions Log</h1>
            <p className="text-sm text-gray-500">Archiv wichtiger Entscheidungen</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#2C3A1C] text-[#C9A227] rounded-lg hover:bg-[#3d4f28] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Entscheidung
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{decisions.length}</div>
          <div className="text-sm text-gray-500">Gesamt</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-[#2C3A1C]">{activeCount}</div>
          <div className="text-sm text-gray-500">Aktiv</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-500">{supersededCount}</div>
          <div className="text-sm text-gray-500">Ersetzt</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-500">{reversedCount}</div>
          <div className="text-sm text-gray-500">Aufgehoben</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227]"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decisions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#C9A227] border-t-transparent rounded-full" />
        </div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Entscheidungen</h3>
          <p className="text-gray-500">Erstelle die erste Entscheidung um zu beginnen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => {
            const isExpanded = expandedIds.has(d.id)
            return (
              <div
                key={d.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpanded(d.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[d.category] || categoryColors.Sonstiges}`}>
                          {d.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[d.status] || statusColors.active}`}>
                          {d.status === 'active' ? 'Aktiv' : d.status === 'superseded' ? 'Ersetzt' : 'Aufgehoben'}
                        </span>
                        {d.projectName && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <ExternalLink className="w-3 h-3" />
                            {d.projectName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{d.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(d.decisionDate).toLocaleDateString('de-DE')}
                        </span>
                        {d.ownerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {d.ownerName}
                          </span>
                        )}
                        {d.tags && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {d.tags.split(',').slice(0, 3).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Kontext */}
                      {d.context && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Kontext</h4>
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{d.context}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Entscheidung */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">✅ Entscheidung</h4>
                        <div className="prose prose-sm max-w-none text-gray-600">
                          <ReactMarkdown>{d.decision}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Alternativen */}
                      {d.alternatives && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">🔀 Alternativen</h4>
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{d.alternatives}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Auswirkung */}
                      {d.impact && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">⚡ Auswirkung</h4>
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{d.impact}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Reversed Reason */}
                      {d.status === 'reversed' && d.reversedReason && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-semibold text-red-600 mb-2">❌ Grund für Aufhebung</h4>
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{d.reversedReason}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(d)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Bearbeiten
                      </button>
                      {d.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const reason = prompt('Grund für Aufhebung (optional):')
                            handleStatusChange(d.id, 'reversed', reason || undefined)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Undo2 className="w-4 h-4" />
                          Aufheben
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(d.id)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Archivieren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDecision ? 'Entscheidung bearbeiten' : 'Neue Entscheidung'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Titel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="z.B. Wahl des State-Management Tools"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>

              {/* Datum + Kategorie */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kontext */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kontext (Warum?)
                </label>
                <textarea
                  value={formContext}
                  onChange={(e) => setFormContext(e.target.value)}
                  rows={3}
                  placeholder="Warum wurde diese Entscheidung nötig? Hintergrund..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>

              {/* Entscheidung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entscheidung *
                </label>
                <textarea
                  value={formDecision}
                  onChange={(e) => setFormDecision(e.target.value)}
                  rows={3}
                  placeholder="Was wurde entschieden? (Markdown unterstützt)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>

              {/* Alternativen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternativen
                </label>
                <textarea
                  value={formAlternatives}
                  onChange={(e) => setFormAlternatives(e.target.value)}
                  rows={2}
                  placeholder="Welche anderen Optionen wurden betrachtet?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>

              {/* Auswirkung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auswirkung
                </label>
                <textarea
                  value={formImpact}
                  onChange={(e) => setFormImpact(e.target.value)}
                  rows={2}
                  placeholder="Welche Auswirkungen hat diese Entscheidung?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>

              {/* Owner + Projekt */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verantwortlicher
                  </label>
                  <input
                    type="text"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    placeholder="z.B. Tomek"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt
                  </label>
                  <input
                    type="text"
                    value={formProjectName}
                    onChange={(e) => setFormProjectName(e.target.value)}
                    placeholder="z.B. ForstManager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Komma-separiert: architektur, performance, security"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-[#2C3A1C] text-[#C9A227] rounded-lg hover:bg-[#3d4f28] transition-colors"
              >
                {editingDecision ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
