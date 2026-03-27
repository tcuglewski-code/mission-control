"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, RefreshCw, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyDigest {
  id: string;
  datum: string;
  inhalt: string;
  tasksDone: number;
  tasksOffen: number;
  tasksNeu: number;
  createdAt: string;
}

// Einfaches Markdown-Rendering (ohne externe Bibliothek)
function MarkdownAnzeige({ text }: { text: string }) {
  const zeilen = text.split("\n");
  return (
    <div className="space-y-2">
      {zeilen.map((zeile, i) => {
        if (zeile.startsWith("# ")) {
          return (
            <h2 key={i} className="text-lg font-bold text-white mt-4 first:mt-0">
              {zeile.slice(2)}
            </h2>
          );
        }
        if (zeile.startsWith("## ")) {
          return (
            <h3 key={i} className="text-sm font-semibold text-zinc-200 mt-3 first:mt-0">
              {zeile.slice(3)}
            </h3>
          );
        }
        if (zeile.startsWith("- ")) {
          return (
            <p key={i} className="text-xs text-zinc-400 pl-3 flex gap-2">
              <span className="text-zinc-600 shrink-0">•</span>
              <span>{zeile.slice(2)}</span>
            </p>
          );
        }
        if (zeile.startsWith("_") && zeile.endsWith("_")) {
          return (
            <p key={i} className="text-[10px] text-zinc-600 italic">
              {zeile.slice(1, -1)}
            </p>
          );
        }
        if (zeile.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        // Fett-Text ersetzen
        const fettFormatiert = zeile.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="text-white font-medium">$1</strong>'
        );
        return (
          <p
            key={i}
            className="text-xs text-zinc-400"
            dangerouslySetInnerHTML={{ __html: fettFormatiert }}
          />
        );
      })}
    </div>
  );
}

export function DigestClient() {
  const [digests, setDigests] = useState<DailyDigest[]>([]);
  const [ausgewaehlt, setAusgewaehlt] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generiere, setGeneriere] = useState(false);

  const ladeDigests = async () => {
    try {
      const res = await fetch("/api/digest");
      if (res.ok) {
        const data = await res.json();
        setDigests(Array.isArray(data) ? data : []);
        if (data.length > 0) setAusgewaehlt(data[0]);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Digests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ladeDigests();
  }, []);

  const handleGenerieren = async () => {
    setGeneriere(true);
    try {
      const res = await fetch("/api/digest/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        await ladeDigests();
      } else {
        const err = await res.json();
        alert(`Fehler: ${err.error}`);
      }
    } catch (err) {
      alert("Fehler beim Generieren des Digests");
    } finally {
      setGeneriere(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Linke Sidebar: Digest-Archiv */}
      <div className="w-64 border-r border-[#2a2a2a] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2a2a2a]">
          <button
            onClick={handleGenerieren}
            disabled={generiere}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", generiere && "animate-spin")} />
            {generiere ? "Wird generiert..." : "Digest generieren"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-zinc-600">Lade Archiv...</div>
          ) : digests.length === 0 ? (
            <div className="p-4 text-xs text-zinc-600">
              Kein Digest vorhanden. Klicke "Digest generieren".
            </div>
          ) : (
            digests.map((d) => (
              <button
                key={d.id}
                onClick={() => setAusgewaehlt(d)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-[#1a1a1a] transition-colors",
                  ausgewaehlt?.id === d.id
                    ? "bg-[#1e1e1e] border-l-2 border-l-emerald-500"
                    : "hover:bg-[#161616]"
                )}
              >
                <p className="text-xs text-white font-medium">
                  {format(new Date(d.datum), "EEEE", { locale: de })}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {format(new Date(d.datum), "d. MMMM yyyy", { locale: de })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-emerald-400">✓ {d.tasksDone}</span>
                  <span className="text-[9px] text-zinc-500">○ {d.tasksOffen}</span>
                  <span className="text-[9px] text-blue-400">+ {d.tasksNeu}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Hauptbereich: Digest anzeigen */}
      <div className="flex-1 overflow-y-auto">
        {ausgewaehlt ? (
          <div className="max-w-3xl mx-auto p-8">
            {/* Digest-Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  <h1 className="text-lg font-bold text-white">Morning Briefing</h1>
                </div>
                <p className="text-sm text-zinc-400">
                  {format(new Date(ausgewaehlt.datum), "EEEE, d. MMMM yyyy", { locale: de })}
                </p>
              </div>

              {/* Statistik-Badges */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{ausgewaehlt.tasksDone} erledigt</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">{ausgewaehlt.tasksOffen} offen</span>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-700/30 border border-zinc-600/20 px-2.5 py-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-400 font-medium">{ausgewaehlt.tasksNeu} neu</span>
                </div>
              </div>
            </div>

            {/* Digest-Inhalt */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
              <MarkdownAnzeige text={ausgewaehlt.inhalt} />
            </div>

            <p className="text-[10px] text-zinc-700 mt-4 text-center">
              Generiert am {format(new Date(ausgewaehlt.createdAt), "d. MMMM yyyy, HH:mm", { locale: de })} Uhr
            </p>
          </div>
        ) : !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
            <Brain className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm mb-2">Kein Digest ausgewählt</p>
            <p className="text-zinc-700 text-xs">
              Generiere deinen ersten täglichen KI-Digest mit dem Button links.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
