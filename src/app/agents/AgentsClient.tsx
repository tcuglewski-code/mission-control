"use client";

import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Bot, Plus, RefreshCw, Wifi, WifiOff, HelpCircle, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  beschreibung?: string | null;
  capabilities: string[];
  status: string;
  letzteAktivitaet?: string | null;
  version?: string | null;
  endpoint?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG = {
  online: {
    label: "Online",
    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    icon: Wifi,
    dotCls: "bg-emerald-400 animate-pulse",
  },
  offline: {
    label: "Offline",
    cls: "bg-zinc-700/30 text-zinc-500 border border-zinc-700/20",
    icon: WifiOff,
    dotCls: "bg-zinc-600",
  },
  unknown: {
    label: "Unbekannt",
    cls: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
    icon: HelpCircle,
    dotCls: "bg-yellow-500/50",
  },
};

// ─── Registrierungs-Modal ─────────────────────────────────────────────────────

function RegistrierModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: "",
    beschreibung: "",
    capabilities: "",
    version: "",
    endpoint: "",
  });
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLaden(true); setFehler(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          beschreibung: form.beschreibung.trim() || undefined,
          capabilities: form.capabilities
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          version: form.version.trim() || undefined,
          endpoint: form.endpoint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onSave();
      onClose();
    } catch (e: any) { setFehler(e.message); } finally { setLaden(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Agenten registrieren</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z.B. amadeus-main" required
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Beschreibung</label>
            <textarea value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
              placeholder="Was tut dieser Agent?" rows={2}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fähigkeiten (kommagetrennt)</label>
            <input type="text" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
              placeholder="code, search, email, planning"
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Version</label>
              <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0.0"
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">API-Endpoint</label>
              <input type="text" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          {fehler && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{fehler}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg">Abbrechen</button>
            <button type="submit" disabled={laden || !form.name.trim()}
              className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium">
              {laden ? "Registriere..." : "Registrieren"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Agent-Karte ──────────────────────────────────────────────────────────────

function AgentKarte({ agent }: { agent: Agent }) {
  const statusConf = STATUS_CONFIG[agent.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
  const StatusIcon = statusConf.icon;

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
            {agent.version && <p className="text-[10px] text-zinc-600">v{agent.version}</p>}
          </div>
        </div>
        <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium", statusConf.cls)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusConf.dotCls)} />
          {statusConf.label}
        </span>
      </div>

      {/* Beschreibung */}
      {agent.beschreibung && (
        <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{agent.beschreibung}</p>
      )}

      {/* Fähigkeiten */}
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.capabilities.map((c) => (
            <span key={c} className="text-[10px] bg-[#252525] border border-[#3a3a3a] text-zinc-400 px-2 py-0.5 rounded">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Letzte Aktivität */}
      <div className="text-[10px] text-zinc-600">
        {agent.letzteAktivitaet
          ? `Zuletzt aktiv: ${formatDistanceToNow(new Date(agent.letzteAktivitaet), { locale: de, addSuffix: true })}`
          : "Noch keine Aktivität"}
      </div>

      {/* Endpoint */}
      {agent.endpoint && (
        <p className="text-[10px] text-zinc-700 mt-1 truncate" title={agent.endpoint}>
          {agent.endpoint}
        </p>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function AgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [laden, setLaden] = useState(true);
  const [zeigeModal, setZeigeModal] = useState(false);

  const ladeAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally { setLaden(false); }
  }, []);

  useEffect(() => { ladeAgents(); }, [ladeAgents]);

  const onlineCount = agents.filter((a) => a.status === "online").length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">Agent Registry</h1>
          <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded-full">
            {agents.length} Agenten · {onlineCount} online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={ladeAgents} className="p-2 text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg border border-[#2a2a2a] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZeigeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium">
            <Plus className="w-3.5 h-3.5" /> Agent registrieren
          </button>
        </div>
      </div>

      {/* Heartbeat API Hinweis */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white font-medium mb-1">Heartbeat API</p>
            <p className="text-[10px] text-zinc-500">
              Agenten können sich via <code className="text-emerald-400 bg-[#252525] px-1 rounded">POST /api/agents/heartbeat</code> registrieren und ihren Status melden.
            </p>
            <code className="block text-[10px] text-zinc-400 bg-[#252525] rounded p-2 mt-2 font-mono">
              {"{ name: \"mein-agent\", status: \"online\", metadata: {} }"}
            </code>
          </div>
        </div>
      </div>

      {/* Agent-Karten */}
      {laden ? (
        <div className="text-center py-16 text-zinc-600 text-sm">Lade Agenten...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16">
          <Bot className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Noch keine Agenten registriert</p>
          <button onClick={() => setZeigeModal(true)}
            className="mt-4 px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg">
            + Ersten Agenten registrieren
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => <AgentKarte key={agent.id} agent={agent} />)}
        </div>
      )}

      {/* Modal */}
      {zeigeModal && (
        <RegistrierModal onClose={() => setZeigeModal(false)} onSave={ladeAgents} />
      )}
    </div>
  );
}
