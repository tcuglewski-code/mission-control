'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Plus, Shield, Filter, X, Edit2, Trash2, CheckCircle, Eye, Clock } from 'lucide-react'
import RiskMatrix from '@/components/risks/RiskMatrix'
import type { Risk } from '@/types/risk'

const CATEGORIES = ['Tech', 'Business', 'Ressourcen', 'Legal', 'External']
const STATUSES = [
  { value: 'identified', label: 'Identifiziert', icon: Eye, color: '#3b82f6' },
  { value: 'mitigated', label: 'Mitigiert', icon: Shield, color: '#22c55e' },
  { value: 'accepted', label: 'Akzeptiert', icon: CheckCircle, color: '#eab308' },
  { value: 'closed', label: 'Geschlossen', icon: X, color: '#6b7280' },
]

const getRiskLevelLabel = (score: number | null): { label: string; color: string } => {
  if (!score) return { label: 'Unbekannt', color: '#6b7280' }
  if (score >= 15) return { label: 'Kritisch', color: '#ef4444' }
  if (score >= 10) return { label: 'Hoch', color: '#f97316' }
  if (score >= 6) return { label: 'Mittel', color: '#eab308' }
  if (score >= 3) return { label: 'Niedrig', color: '#84cc16' }
  return { label: 'Minimal', color: '#22c55e' }
}

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Tech',
    probability: 3,
    impact: 3,
    status: 'identified',
    mitigations: '',
    contingency: '',
    ownerName: '',
    dueDate: ''
  })

  const fetchRisks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.append('category', filterCategory)
      if (filterStatus) params.append('status', filterStatus)
      
      const res = await fetch(`/api/risks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRisks(data)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Risiken:', error)
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterStatus])

  useEffect(() => {
    fetchRisks()
  }, [fetchRisks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingRisk ? `/api/risks/${editingRisk.id}` : '/api/risks'
      const method = editingRisk ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setEditingRisk(null)
        resetForm()
        fetchRisks()
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
    }
  }

  const handleDelete = async (risk: Risk) => {
    if (!confirm(`Risiko "${risk.title}" wirklich löschen?`)) return
    
    try {
      const res = await fetch(`/api/risks/${risk.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRisks()
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
    }
  }

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk)
    setFormData({
      title: risk.title,
      description: risk.description || '',
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      mitigations: risk.mitigations || '',
      contingency: risk.contingency || '',
      ownerName: risk.ownerName || '',
      dueDate: risk.dueDate ? risk.dueDate.split('T')[0] : ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Tech',
      probability: 3,
      impact: 3,
      status: 'identified',
      mitigations: '',
      contingency: '',
      ownerName: '',
      dueDate: ''
    })
  }

  // Stats
  const stats = {
    total: risks.filter(r => r.status !== 'closed').length,
    critical: risks.filter(r => (r.riskScore || 0) >= 15 && r.status !== 'closed').length,
    high: risks.filter(r => (r.riskScore || 0) >= 10 && (r.riskScore || 0) < 15 && r.status !== 'closed').length,
    mitigated: risks.filter(r => r.status === 'mitigated').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[#d4a574] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-[#d4a574]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Risk Register</h1>
            <p className="text-[#a3b18a]">Identifiziere, bewerte und steuere Projektrisiken</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingRisk(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-[#1a2e1a] rounded-lg hover:bg-[#c49464] transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Neues Risiko
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1a2e1a] rounded-lg p-4 border border-[#2d4a2d]">
          <p className="text-[#a3b18a] text-sm">Aktive Risiken</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1a2e1a] rounded-lg p-4 border border-[#2d4a2d]">
          <p className="text-[#a3b18a] text-sm">Kritisch</p>
          <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
        </div>
        <div className="bg-[#1a2e1a] rounded-lg p-4 border border-[#2d4a2d]">
          <p className="text-[#a3b18a] text-sm">Hoch</p>
          <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
        </div>
        <div className="bg-[#1a2e1a] rounded-lg p-4 border border-[#2d4a2d]">
          <p className="text-[#a3b18a] text-sm">Mitigiert</p>
          <p className="text-2xl font-bold text-green-500">{stats.mitigated}</p>
        </div>
      </div>

      {/* Risk Matrix */}
      <RiskMatrix risks={risks} onRiskClick={handleEdit} />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Filter className="h-5 w-5 text-[#a3b18a]" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[#243318] text-white px-3 py-2 rounded-lg border border-[#2d4a2d] text-sm"
        >
          <option value="">Alle Kategorien</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#243318] text-white px-3 py-2 rounded-lg border border-[#2d4a2d] text-sm"
        >
          <option value="">Alle Status</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {(filterCategory || filterStatus) && (
          <button
            onClick={() => { setFilterCategory(''); setFilterStatus('') }}
            className="text-[#a3b18a] hover:text-white text-sm flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Risk List */}
      <div className="space-y-3">
        {risks.length === 0 ? (
          <div className="bg-[#1a2e1a] rounded-lg p-8 border border-[#2d4a2d] text-center">
            <AlertTriangle className="h-12 w-12 text-[#a3b18a] mx-auto mb-4" />
            <p className="text-[#a3b18a]">Keine Risiken gefunden</p>
            <p className="text-sm text-[#6b7280] mt-2">Erstelle dein erstes Risiko um zu beginnen</p>
          </div>
        ) : (
          risks.map(risk => {
            const level = getRiskLevelLabel(risk.riskScore)
            const statusInfo = STATUSES.find(s => s.value === risk.status)
            
            return (
              <div 
                key={risk.id}
                className="bg-[#1a2e1a] rounded-lg p-4 border border-[#2d4a2d] hover:border-[#3d5a3d] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{risk.title}</h3>
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: level.color + '20', color: level.color }}
                      >
                        {level.label} ({risk.riskScore})
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs bg-[#243318] text-[#a3b18a]"
                      >
                        {risk.category}
                      </span>
                      {statusInfo && (
                        <span 
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                        >
                          <statusInfo.icon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                    
                    {risk.description && (
                      <p className="text-[#a3b18a] text-sm mb-2">{risk.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                      <span>P: {risk.probability}/5</span>
                      <span>A: {risk.impact}/5</span>
                      {risk.ownerName && <span>Owner: {risk.ownerName}</span>}
                      {risk.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(risk.dueDate).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                    
                    {risk.mitigations && (
                      <div className="mt-3 pt-3 border-t border-[#2d4a2d]">
                        <p className="text-xs text-[#d4a574] mb-1">Gegenmaßnahmen:</p>
                        <p className="text-sm text-[#a3b18a]">{risk.mitigations}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(risk)}
                      className="p-2 text-[#a3b18a] hover:text-white hover:bg-[#243318] rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(risk)}
                      className="p-2 text-[#a3b18a] hover:text-red-500 hover:bg-[#243318] rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2e1a] rounded-xl border border-[#2d4a2d] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2d4a2d] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingRisk ? 'Risiko bearbeiten' : 'Neues Risiko'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingRisk(null) }}
                className="text-[#a3b18a] hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#a3b18a] mb-1">Titel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none"
                  placeholder="z.B. API-Abhängigkeit von externem Service"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#a3b18a] mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none resize-none"
                  placeholder="Detaillierte Beschreibung des Risikos..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">Kategorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">
                    Wahrscheinlichkeit: {formData.probability}/5
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                    className="w-full accent-[#d4a574]"
                  />
                  <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                    <span>Sehr gering</span>
                    <span>Sehr hoch</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">
                    Auswirkung: {formData.impact}/5
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                    className="w-full accent-[#d4a574]"
                  />
                  <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                    <span>Minimal</span>
                    <span>Kritisch</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-[#243318] rounded-lg text-center">
                <span className="text-[#a3b18a] text-sm">Risk Score: </span>
                <span 
                  className="font-bold text-lg"
                  style={{ color: getRiskLevelLabel(formData.probability * formData.impact).color }}
                >
                  {formData.probability * formData.impact} — {getRiskLevelLabel(formData.probability * formData.impact).label}
                </span>
              </div>
              
              <div>
                <label className="block text-sm text-[#a3b18a] mb-1">Gegenmaßnahmen</label>
                <textarea
                  value={formData.mitigations}
                  onChange={(e) => setFormData({ ...formData, mitigations: e.target.value })}
                  rows={3}
                  className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none resize-none"
                  placeholder="Maßnahmen um das Risiko zu reduzieren..."
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#a3b18a] mb-1">Notfallplan</label>
                <textarea
                  value={formData.contingency}
                  onChange={(e) => setFormData({ ...formData, contingency: e.target.value })}
                  rows={2}
                  className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none resize-none"
                  placeholder="Was tun, falls das Risiko eintritt..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">Verantwortlicher</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none"
                    placeholder="Name des Verantwortlichen"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#a3b18a] mb-1">Deadline für Maßnahmen</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#243318] text-white px-4 py-2 rounded-lg border border-[#2d4a2d] focus:border-[#d4a574] focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2d4a2d]">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingRisk(null) }}
                  className="px-4 py-2 text-[#a3b18a] hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#d4a574] text-[#1a2e1a] rounded-lg hover:bg-[#c49464] transition-colors font-medium"
                >
                  {editingRisk ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
