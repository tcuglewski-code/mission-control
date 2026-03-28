"use client";

import { useState } from "react";
import { Plus, Wrench, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tool } from "@/store/useAppStore";

const TOOL_TYPES = [
  { value: "all", label: "Alle" },
  { value: "api", label: "API" },
  { value: "database", label: "Datenbank" },
  { value: "library", label: "Library" },
  { value: "hosting", label: "Hosting" },
  { value: "vcs", label: "VCS" },
  { value: "cli", label: "CLI" },
];
const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  active: { icon: CheckCircle2, color: "text-emerald-400" },
  inactive: { icon: XCircle, color: "text-red-400" },
  error: { icon: AlertCircle, color: "text-orange-400" },
};

const TYPE_BADGES: Record<string, string> = {
  api: "bg-blue-500/10 text-blue-400",
  database: "bg-emerald-500/10 text-emerald-400",
  library: "bg-purple-500/10 text-purple-400",
  hosting: "bg-orange-500/10 text-orange-400",
  vcs: "bg-zinc-700/30 text-zinc-400",
  cli: "bg-yellow-500/10 text-yellow-400",
};

interface ToolsClientProps {
  initialTools: Tool[];
}

export function ToolsClient({ initialTools }: ToolsClientProps) {
  const [tools, setTools] = useState<Tool[]>(initialTools);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [form, setForm] = useState({ name: "", description: "", type: "api", status: "active", config: "" });
  const [loading, setLoading] = useState(false);

  const filtered = typeFilter === "all" ? tools : tools.filter((t) => t.type === typeFilter);
  // Use TOOL_TYPES for rendering

  const openCreate = () => {
    setEditTool(null);
    setForm({ name: "", description: "", type: "api", status: "active", config: "" });
    setShowModal(true);
  };

  const openEdit = (tool: Tool) => {
    setEditTool(tool);
    setForm({
      name: tool.name,
      description: tool.description ?? "",
      type: tool.type,
      status: tool.status,
      config: tool.config ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editTool) {
        const res = await fetch("/api/tools", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editTool.id, ...form }),
        });
        if (res.ok) {
          const updated = await res.json();
          setTools(tools.map((t) => (t.id === editTool.id ? updated : t)));
        }
      } else {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setTools([...tools, created]);
        }
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tool wirklich entfernen?")) return;
    const res = await fetch(`/api/tools?id=${id}`, { method: "DELETE" });
    if (res.ok) setTools(tools.filter((t) => t.id !== id));
  };

  const toggleStatus = async (tool: Tool) => {
    const newStatus = tool.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/tools", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tool.id, status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTools(tools.map((t) => (t.id === tool.id ? updated : t)));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          {TOOL_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setTypeFilter(type.value)}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                typeFilter === type.value ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tool
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Wrench className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Tools</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tool) => {
            const StatusIcon = STATUS_ICONS[tool.status]?.icon ?? AlertCircle;
            const statusColor = STATUS_ICONS[tool.status]?.color ?? "text-zinc-400";
            const typeBadge = TYPE_BADGES[tool.type] ?? "bg-zinc-700/30 text-zinc-400";

            return (
              <div
                key={tool.id}
                className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#252525] border border-[#3a3a3a] flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", typeBadge)}>
                        {tool.type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleStatus(tool)}
                    className={cn("flex items-center gap-1 text-xs transition-opacity", statusColor)}
                    title={`Status: ${tool.status}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </button>
                </div>

                {tool.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{tool.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                  <span className={cn("text-xs", statusColor)}>{tool.status}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(tool)}
                      className="px-2 py-1 text-[11px] text-zinc-500 hover:text-white hover:bg-[#252525] rounded transition-colors"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      className="px-2 py-1 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">{editTool ? "Tool bearbeiten" : "Neues Tool"}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tool-Name..."
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Beschreibung</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Was macht dieses Tool?"
                  rows={3}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Typ</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {TOOL_TYPES.filter((t) => t.value !== "all").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Config (JSON)</label>
                <textarea
                  value={form.config}
                  onChange={(e) => setForm({ ...form, config: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={3}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors">
                  Abbrechen
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
                  {loading ? "Speichern..." : editTool ? "Aktualisieren" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
