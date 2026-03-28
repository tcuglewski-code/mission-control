"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Moon,
  Clock,
  Save,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ─── Typen ────────────────────────────────────────────────────────────────────

type Channel = "inapp" | "email" | "both" | "none";

interface EventPref {
  active: boolean;
  channel: Channel;
}

interface NotifPrefs {
  task_assigned: EventPref;
  comment_added: EventPref;
  deadline_tomorrow: EventPref;
  project_status_changed: EventPref;
  new_invoice: EventPref;
  blocker_resolved: EventPref;
}

const DEFAULT_PREFS: NotifPrefs = {
  task_assigned: { active: true, channel: "both" },
  comment_added: { active: true, channel: "inapp" },
  deadline_tomorrow: { active: true, channel: "both" },
  project_status_changed: { active: true, channel: "inapp" },
  new_invoice: { active: true, channel: "email" },
  blocker_resolved: { active: true, channel: "inapp" },
};

const EVENT_LABELS: Record<keyof NotifPrefs, { label: string; description: string; icon: string }> = {
  task_assigned: {
    label: "Neue Aufgabe zugewiesen",
    description: "Eine Aufgabe wurde dir zugewiesen",
    icon: "📋",
  },
  comment_added: {
    label: "Kommentar auf meine Aufgabe",
    description: "Jemand hat eine deiner Aufgaben kommentiert",
    icon: "💬",
  },
  deadline_tomorrow: {
    label: "Deadline morgen",
    description: "Erinnerung: eine Aufgabe ist morgen fällig",
    icon: "⏰",
  },
  project_status_changed: {
    label: "Projekt-Status geändert",
    description: "Der Status eines Projekts wurde aktualisiert",
    icon: "🔄",
  },
  new_invoice: {
    label: "Neue Rechnung",
    description: "Eine neue Rechnung wurde erstellt",
    icon: "🧾",
  },
  blocker_resolved: {
    label: "Blocker aufgehoben",
    description: "Ein Blocker in deinem Aufgabenbereich wurde gelöst",
    icon: "✅",
  },
};

const CHANNEL_OPTIONS: { value: Channel; label: string; icon: React.ReactNode }[] = [
  { value: "inapp", label: "In-App", icon: <Smartphone className="w-3 h-3" /> },
  { value: "email", label: "E-Mail", icon: <Mail className="w-3 h-3" /> },
  { value: "both", label: "Beide", icon: <Bell className="w-3 h-3" /> },
  { value: "none", label: "Deaktiviert", icon: <span className="w-3 h-3 block" /> },
];

const DIGEST_FREQ = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "never", label: "Niemals" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00 Uhr`,
}));

const DIGEST_TIMES = Array.from({ length: 24 }, (_, i) => ({
  value: `${String(i).padStart(2, "0")}:00`,
  label: `${String(i).padStart(2, "0")}:00 Uhr`,
}));

// ─── Toggle-Komponente ────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        checked ? "bg-emerald-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function NotificationsSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Zustand
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [digestFreq, setDigestFreq] = useState("daily");
  const [digestTime, setDigestTime] = useState("08:00");

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifPrefs) {
          setPrefs({ ...DEFAULT_PREFS, ...data.notifPrefs });
        }
        if (data.quietHoursStart !== undefined) setQuietStart(data.quietHoursStart);
        if (data.quietHoursEnd !== undefined) setQuietEnd(data.quietHoursEnd);
        if (data.digestFrequency) setDigestFreq(data.digestFrequency);
        if (data.digestTime) setDigestTime(data.digestTime);
        // Ruhezeit aktiviert wenn start != end
        setQuietEnabled(data.quietHoursStart !== data.quietHoursEnd);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = (key: keyof NotifPrefs, partial: Partial<EventPref>) => {
    setPrefs((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifPrefs: prefs,
          quietHoursStart: quietEnabled ? quietStart : 0,
          quietHoursEnd: quietEnabled ? quietEnd : 0,
          digestFrequency: digestFreq,
          digestTime,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      setMsg({ type: "ok", text: "Einstellungen gespeichert" });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ type: "err", text: "Fehler beim Speichern. Bitte erneut versuchen." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Lade Einstellungen…</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* ─── Ereignis-Einstellungen ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Ereignis-Einstellungen</h2>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] overflow-hidden divide-y divide-[#2a2a2a]">
          {(Object.keys(EVENT_LABELS) as (keyof NotifPrefs)[]).map((key) => {
            const meta = EVENT_LABELS[key];
            const pref = prefs[key];
            return (
              <div
                key={key}
                className={`flex items-center gap-4 px-4 py-3 bg-[#111] transition-colors ${
                  pref.active ? "" : "opacity-50"
                }`}
              >
                <span className="text-xl shrink-0 w-7 text-center">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{meta.label}</p>
                  <p className="text-xs text-zinc-500 truncate">{meta.description}</p>
                </div>
                {/* Kanal-Auswahl */}
                <div className="flex items-center gap-1 shrink-0">
                  {CHANNEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!pref.active}
                      onClick={() => updatePref(key, { channel: opt.value })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        pref.channel === opt.value
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-[#1c1c1c] border border-transparent"
                      }`}
                      title={opt.label}
                    >
                      {opt.icon}
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {/* Aktiv/Inaktiv Toggle */}
                <Toggle
                  checked={pref.active}
                  onChange={(v) => updatePref(key, { active: v })}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Ruhezeiten ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Moon className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Ruhezeiten</h2>
          <span className="text-xs text-zinc-500">Keine E-Mail-Benachrichtigungen in dieser Zeit</span>
          <div className="ml-auto">
            <Toggle checked={quietEnabled} onChange={setQuietEnabled} />
          </div>
        </div>
        <div
          className={`rounded-xl border border-[#2a2a2a] bg-[#111] p-4 transition-opacity ${
            quietEnabled ? "" : "opacity-40 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Von</span>
              <select
                value={quietStart}
                onChange={(e) => setQuietStart(Number(e.target.value))}
                className="bg-[#1c1c1c] border border-[#333] rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">bis</span>
              <select
                value={quietEnd}
                onChange={(e) => setQuietEnd(Number(e.target.value))}
                className="bg-[#1c1c1c] border border-[#333] rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {quietEnabled && (
            <p className="text-xs text-zinc-600 mt-3">
              Zwischen {String(quietStart).padStart(2, "0")}:00 und {String(quietEnd).padStart(2, "0")}:00 Uhr werden keine E-Mails gesendet.
            </p>
          )}
        </div>
      </section>

      {/* ─── E-Mail Digest ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white">E-Mail Digest</h2>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4 space-y-4">
          {/* Frequenz */}
          <div>
            <label className="text-xs text-zinc-400 block mb-2">Häufigkeit</label>
            <div className="flex gap-2 flex-wrap">
              {DIGEST_FREQ.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setDigestFreq(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    digestFreq === f.value
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#1c1c1c] text-zinc-400 border border-[#333] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Uhrzeit */}
          {digestFreq !== "never" && (
            <div>
              <label className="text-xs text-zinc-400 block mb-2">Versandzeitpunkt</label>
              <select
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                className="bg-[#1c1c1c] border border-[#333] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {DIGEST_TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vorschau-Button */}
          <div className="pt-2 border-t border-[#2a2a2a]">
            <Link
              href="/settings/notifications/digest-preview"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] border border-[#333] hover:border-zinc-600 text-zinc-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              E-Mail Vorschau ansehen
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Speichern ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        {msg && (
          <div
            className={`flex items-center gap-2 text-sm ${
              msg.type === "ok" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {msg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
}
