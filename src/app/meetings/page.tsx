"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, ChevronDown, ChevronRight, Trash2, Edit, Users, Clock, CheckCircle2, Circle, ArrowRight, FileText, Video, Phone, Building2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface MeetingActionItem {
  id: string
  title: string
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  status: string
  priority: string
  taskId: string | null
}

interface Meeting {
  id: string
  title: string
  date: string
  duration: number | null
  location: string | null
  participants: string | null
  agenda: string | null
  notes: string | null
  decisions: string | null
  projectId: string | null
  projectName: string | null
  organizerId: string | null
  organizerName: string | null
  status: string
  actionItems: MeetingActionItem[]
}

interface Participant {
  name: string
  email?: string
}

const statusConfig = {
  "scheduled": { label: "Geplant", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
  "completed": { label: "Abgeschlossen", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" },
  "cancelled": { label: "Abgesagt", color: "bg-gray-500", textColor: "text-gray-700", bgLight: "bg-gray-50" }
}

const locationIcons: Record<string, typeof Video> = {
  "Video-Call": Video,
  "Büro": Building2,
  "Telefon": Phone,
  "Vor Ort": Building2,
}

const priorityColors: Record<string, string> = {
  "low": "text-gray-500",
  "medium": "text-amber-600",
  "high": "text-red-600"
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")

  // New meeting form
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formDuration, setFormDuration] = useState("60")
  const [formLocation, setFormLocation] = useState("Video-Call")
  const [formParticipants, setFormParticipants] = useState("")
  const [formAgenda, setFormAgenda] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formDecisions, setFormDecisions] = useState("")
  const [formStatus, setFormStatus] = useState("scheduled")

  // Action item form
  const [addingActionTo, setAddingActionTo] = useState<string | null>(null)
  const [newActionTitle, setNewActionTitle] = useState("")
  const [newActionAssignee, setNewActionAssignee] = useState("")
  const [newActionDue, setNewActionDue] = useState("")
  const [newActionPriority, setNewActionPriority] = useState("medium")

  useEffect(() => {
    fetchMeetings()
  }, [statusFilter])

  async function fetchMeetings() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      
      const res = await fetch(`/api/meetings?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormTitle("")
    setFormDate("")
    setFormDuration("60")
    setFormLocation("Video-Call")
    setFormParticipants("")
    setFormAgenda("")
    setFormNotes("")
    setFormDecisions("")
    setFormStatus("scheduled")
    setShowNewForm(false)
    setEditingId(null)
  }

  async function createMeeting() {
    if (!formTitle.trim() || !formDate) return

    const participants = formParticipants
      .split(",")
      .map(p => p.trim())
      .filter(Boolean)
      .map(name => ({ name }))

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          date: formDate,
          duration: parseInt(formDuration, 10),
          location: formLocation,
          participants,
          agenda: formAgenda || null,
          notes: formNotes || null,
          decisions: formDecisions || null,
          status: formStatus,
        })
      })

      if (res.ok) {
        resetForm()
        fetchMeetings()
      }
    } catch (error) {
      console.error("Failed to create meeting:", error)
    }
  }

  async function updateMeeting(id: string) {
    const participants = formParticipants
      .split(",")
      .map(p => p.trim())
      .filter(Boolean)
      .map(name => ({ name }))

    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          date: formDate,
          duration: parseInt(formDuration, 10),
          location: formLocation,
          participants,
          agenda: formAgenda || null,
          notes: formNotes || null,
          decisions: formDecisions || null,
          status: formStatus,
        })
      })

      if (res.ok) {
        resetForm()
        fetchMeetings()
      }
    } catch (error) {
      console.error("Failed to update meeting:", error)
    }
  }

  async function deleteMeeting(id: string) {
    if (!confirm("Meeting wirklich löschen? Alle Action Items werden ebenfalls gelöscht.")) return

    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchMeetings()
      }
    } catch (error) {
      console.error("Failed to delete meeting:", error)
    }
  }

  function startEdit(meeting: Meeting) {
    setEditingId(meeting.id)
    setFormTitle(meeting.title)
    setFormDate(meeting.date.split("T")[0])
    setFormDuration(String(meeting.duration || 60))
    setFormLocation(meeting.location || "Video-Call")
    setFormParticipants(
      meeting.participants
        ? JSON.parse(meeting.participants).map((p: Participant) => p.name).join(", ")
        : ""
    )
    setFormAgenda(meeting.agenda || "")
    setFormNotes(meeting.notes || "")
    setFormDecisions(meeting.decisions || "")
    setFormStatus(meeting.status)
    setShowNewForm(true)
  }

  async function addActionItem(meetingId: string) {
    if (!newActionTitle.trim()) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newActionTitle,
          assigneeName: newActionAssignee || null,
          dueDate: newActionDue || null,
          priority: newActionPriority,
        })
      })

      if (res.ok) {
        setAddingActionTo(null)
        setNewActionTitle("")
        setNewActionAssignee("")
        setNewActionDue("")
        setNewActionPriority("medium")
        fetchMeetings()
      }
    } catch (error) {
      console.error("Failed to add action item:", error)
    }
  }

  async function toggleActionStatus(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "done" ? "open" : "done"
    
    try {
      await fetch(`/api/meetings/action-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      fetchMeetings()
    } catch (error) {
      console.error("Failed to update action item:", error)
    }
  }

  async function createTaskFromAction(itemId: string) {
    try {
      const res = await fetch(`/api/meetings/action-items/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })
      if (res.ok) {
        fetchMeetings()
        alert("Task erstellt!")
      }
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  async function deleteActionItem(itemId: string) {
    try {
      await fetch(`/api/meetings/action-items/${itemId}`, { method: "DELETE" })
      fetchMeetings()
    } catch (error) {
      console.error("Failed to delete action item:", error)
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C3A1C]"></div>
      </div>
    )
  }

  // Stats
  const totalMeetings = meetings.length
  const scheduledCount = meetings.filter(m => m.status === "scheduled").length
  const completedCount = meetings.filter(m => m.status === "completed").length
  const openActionItems = meetings.reduce((acc, m) => acc + m.actionItems.filter(a => a.status !== "done").length, 0)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2C3A1C] rounded-lg">
            <Calendar className="h-6 w-6 text-[#D4A853]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#2C3A1C]">Meeting Notes</h1>
            <p className="text-sm text-gray-600">Meetings, Protokolle & Action Items</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2C3A1C] text-white rounded-lg hover:bg-[#3d4f2a] transition"
        >
          <Plus className="h-4 w-4" />
          Neues Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-[#2C3A1C]">{totalMeetings}</div>
          <div className="text-sm text-gray-600">Meetings gesamt</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <div className="text-2xl font-bold text-blue-700">{scheduledCount}</div>
          <div className="text-sm text-blue-600">Geplant</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="text-2xl font-bold text-green-700">{completedCount}</div>
          <div className="text-sm text-green-600">Abgeschlossen</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="text-2xl font-bold text-amber-700">{openActionItems}</div>
          <div className="text-sm text-amber-600">Offene Action Items</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Alle Status</option>
          <option value="scheduled">Geplant</option>
          <option value="completed">Abgeschlossen</option>
          <option value="cancelled">Abgesagt</option>
        </select>
      </div>

      {/* New/Edit Meeting Form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#2C3A1C]">
            {editingId ? "Meeting bearbeiten" : "Neues Meeting"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z.B. Sprint Planning Q2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum & Zeit *</label>
              <input
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Minuten)</label>
              <input
                type="number"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <select
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              >
                <option value="Video-Call">Video-Call</option>
                <option value="Büro">Büro</option>
                <option value="Telefon">Telefon</option>
                <option value="Vor Ort">Vor Ort</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer (kommagetrennt)</label>
              <input
                type="text"
                value={formParticipants}
                onChange={(e) => setFormParticipants(e.target.value)}
                placeholder="z.B. Tomek, Klaus, Maria"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
              >
                <option value="scheduled">Geplant</option>
                <option value="completed">Abgeschlossen</option>
                <option value="cancelled">Abgesagt</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agenda (Markdown)</label>
            <textarea
              value={formAgenda}
              onChange={(e) => setFormAgenda(e.target.value)}
              rows={3}
              placeholder="- Punkt 1&#10;- Punkt 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen / Protokoll (Markdown)</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={5}
              placeholder="Meeting-Notizen hier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschlüsse (Markdown)</label>
            <textarea
              value={formDecisions}
              onChange={(e) => setFormDecisions(e.target.value)}
              rows={3}
              placeholder="- Beschluss 1&#10;- Beschluss 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => editingId ? updateMeeting(editingId) : createMeeting()}
              disabled={!formTitle.trim() || !formDate}
              className="px-4 py-2 bg-[#2C3A1C] text-white rounded-lg hover:bg-[#3d4f2a] transition disabled:opacity-50"
            >
              {editingId ? "Speichern" : "Meeting erstellen"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Meetings</h3>
          <p className="text-gray-600 mb-4">Erstelle dein erstes Meeting um loszulegen.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-[#2C3A1C] text-white rounded-lg hover:bg-[#3d4f2a] transition"
          >
            Meeting erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isExpanded = expandedIds.has(meeting.id)
            const config = statusConfig[meeting.status as keyof typeof statusConfig] || statusConfig.scheduled
            const participants: Participant[] = meeting.participants ? JSON.parse(meeting.participants) : []
            const LocationIcon = locationIcons[meeting.location || ""] || Building2

            return (
              <div key={meeting.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Meeting Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleExpanded(meeting.id)}
                >
                  <div className="flex items-start gap-3">
                    <button className="mt-1 text-gray-400">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#2C3A1C]">{meeting.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${config.bgLight} ${config.textColor}`}>
                          {config.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(meeting.date).toLocaleDateString("de-DE", { 
                            weekday: "short", 
                            day: "numeric", 
                            month: "short", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        {meeting.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {meeting.duration} Min
                          </span>
                        )}
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <LocationIcon className="h-4 w-4" />
                            {meeting.location}
                          </span>
                        )}
                        {participants.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {participants.length} Teilnehmer
                          </span>
                        )}
                        {meeting.actionItems.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {meeting.actionItems.filter(a => a.status !== "done").length} / {meeting.actionItems.length} Action Items offen
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => startEdit(meeting)}
                        className="p-2 text-gray-400 hover:text-[#2C3A1C] hover:bg-gray-100 rounded-lg transition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMeeting(meeting.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                    {/* Participants */}
                    {participants.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Teilnehmer</h4>
                        <div className="flex flex-wrap gap-2">
                          {participants.map((p, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-full text-sm">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agenda */}
                    {meeting.agenda && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Agenda</h4>
                        <div className="prose prose-sm max-w-none bg-white rounded-lg p-3 border border-gray-200">
                          <ReactMarkdown>{meeting.agenda}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {meeting.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Protokoll</h4>
                        <div className="prose prose-sm max-w-none bg-white rounded-lg p-3 border border-gray-200">
                          <ReactMarkdown>{meeting.notes}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Decisions */}
                    {meeting.decisions && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Beschlüsse</h4>
                        <div className="prose prose-sm max-w-none bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <ReactMarkdown>{meeting.decisions}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Action Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Action Items</h4>
                        <button
                          onClick={() => setAddingActionTo(addingActionTo === meeting.id ? null : meeting.id)}
                          className="text-sm text-[#2C3A1C] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Hinzufügen
                        </button>
                      </div>

                      {/* Add Action Item Form */}
                      {addingActionTo === meeting.id && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3 space-y-2">
                          <input
                            type="text"
                            value={newActionTitle}
                            onChange={(e) => setNewActionTitle(e.target.value)}
                            placeholder="Action Item Titel..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2C3A1C] focus:border-transparent"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newActionAssignee}
                              onChange={(e) => setNewActionAssignee(e.target.value)}
                              placeholder="Verantwortlich"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input
                              type="date"
                              value={newActionDue}
                              onChange={(e) => setNewActionDue(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <select
                              value={newActionPriority}
                              onChange={(e) => setNewActionPriority(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="low">Niedrig</option>
                              <option value="medium">Mittel</option>
                              <option value="high">Hoch</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addActionItem(meeting.id)}
                              disabled={!newActionTitle.trim()}
                              className="px-3 py-1.5 bg-[#2C3A1C] text-white rounded-lg text-sm disabled:opacity-50"
                            >
                              Hinzufügen
                            </button>
                            <button
                              onClick={() => setAddingActionTo(null)}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Items List */}
                      {meeting.actionItems.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Keine Action Items</p>
                      ) : (
                        <div className="space-y-2">
                          {meeting.actionItems.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-2 rounded-lg bg-white border ${
                                item.status === "done" ? "border-green-200 bg-green-50" : "border-gray-200"
                              }`}
                            >
                              <button
                                onClick={() => toggleActionStatus(item.id, item.status)}
                                className="flex-shrink-0"
                              >
                                {item.status === "done" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400 hover:text-[#2C3A1C]" />
                                )}
                              </button>
                              <span className={`flex-1 text-sm ${item.status === "done" ? "line-through text-gray-500" : ""}`}>
                                {item.title}
                              </span>
                              {item.assigneeName && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {item.assigneeName}
                                </span>
                              )}
                              {item.dueDate && (
                                <span className="text-xs text-gray-500">
                                  bis {new Date(item.dueDate).toLocaleDateString("de-DE")}
                                </span>
                              )}
                              <span className={`text-xs font-medium ${priorityColors[item.priority] || "text-gray-500"}`}>
                                {item.priority === "high" ? "!" : item.priority === "low" ? "↓" : ""}
                              </span>
                              {!item.taskId && item.status !== "done" && (
                                <button
                                  onClick={() => createTaskFromAction(item.id)}
                                  title="Als Task erstellen"
                                  className="p-1 text-gray-400 hover:text-[#2C3A1C] hover:bg-gray-100 rounded transition"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                              {item.taskId && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                  Task ✓
                                </span>
                              )}
                              <button
                                onClick={() => deleteActionItem(item.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
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
