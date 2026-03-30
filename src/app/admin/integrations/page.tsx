"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Play,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlackConfig {
  configured: boolean;
  id?: string;
  type: string;
  name: string;
  webhookUrl?: string;
  webhookUrlSet?: boolean;
  channelId?: string;
  events: string[];
  enabled: boolean;
  status: "active" | "inactive" | "error";
  lastTestedAt?: string;
  lastError?: string;
}

const AVAILABLE_EVENTS = [
  { id: "task.created", label: "Task erstellt", icon: "📋" },
  { id: "task.completed", label: "Task abgeschlossen", icon: "✅" },
  { id: "task.updated", label: "Task aktualisiert", icon: "📝" },
  { id: "ticket.created", label: "Support-Ticket erstellt", icon: "🎫" },
  { id: "ticket.resolved", label: "Ticket gelöst", icon: "🔧" },
  { id: "comment.added", label: "Kommentar hinzugefügt", icon: "💬" },
];

export default function IntegrationsPage() {
  const [slack, setSlack] = useState<SlackConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showWebhook, setShowWebhook] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetchSlackConfig();
  }, []);

  async function fetchSlackConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/slack");
      if (res.ok) {
        const data = await res.json();
        setSlack(data);
        setSelectedEvents(data.events || []);
        setEnabled(data.enabled);
        // Webhook URL nur setzen wenn neu (nicht maskiert anzeigen)
        if (!data.webhookUrlSet) {
          setWebhookUrl("");
        }
      }
    } catch (error) {
      console.error("Failed to fetch Slack config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        events: selectedEvents,
        enabled,
      };
      // Nur Webhook-URL senden wenn eingegeben
      if (webhookUrl) {
        body.webhookUrl = webhookUrl;
      }

      const res = await fetch("/api/integrations/slack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchSlackConfig();
        setWebhookUrl(""); // Reset Eingabe nach Speichern
        setTestResult({
          success: true,
          message: "Konfiguration gespeichert!",
        });
      } else {
        const err = await res.json();
        setTestResult({
          success: false,
          message: err.error || "Speichern fehlgeschlagen",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Netzwerkfehler beim Speichern",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/slack/test", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `✅ ${data.message} (${data.duration}ms)`,
        });
        await fetchSlackConfig();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Test fehlgeschlagen",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Netzwerkfehler beim Test",
      });
    } finally {
      setTesting(false);
    }
  }

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const statusColor = {
    active: "text-emerald-400",
    inactive: "text-zinc-500",
    error: "text-red-400",
  };

  const statusBg = {
    active: "bg-emerald-500/10 border-emerald-500/20",
    inactive: "bg-zinc-500/10 border-zinc-500/20",
    error: "bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-[#2C3A1C] rounded-lg">
          <Zap className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Integrationen</h1>
          <p className="text-sm text-zinc-400">
            Verbinde Mission Control mit externen Diensten
          </p>
        </div>
      </div>

      {/* Slack Card */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-medium">Slack</h2>
              <p className="text-xs text-zinc-500">
                Benachrichtigungen in Slack-Channels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <span
              className={cn(
                "text-xs px-2 py-1 rounded border",
                statusBg[slack?.status || "inactive"]
              )}
            >
              <span className={statusColor[slack?.status || "inactive"]}>
                {slack?.status === "active" && "● Aktiv"}
                {slack?.status === "inactive" && "○ Inaktiv"}
                {slack?.status === "error" && "⚠ Fehler"}
              </span>
            </span>
            {/* Enable Toggle */}
            <button
              onClick={() => setEnabled(!enabled)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                enabled ? "bg-emerald-600" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  enabled ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Webhook URL
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-emerald-400 hover:underline text-xs"
              >
                Wie erstelle ich einen Webhook?{" "}
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showWebhook ? "text" : "password"}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={
                  slack?.webhookUrlSet
                    ? "Webhook konfiguriert (zum Ändern neuen eingeben)"
                    : "https://hooks.slack.com/services/T.../B.../..."
                }
                className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 pr-10 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWebhook(!showWebhook)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showWebhook ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {slack?.webhookUrlSet && (
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                Webhook ist konfiguriert
              </p>
            )}
          </div>

          {/* Events */}
          <div>
            <label className="block text-sm text-zinc-400 mb-3">
              Benachrichtigen bei
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedEvents.includes(event.id)
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-[#252525] border-[#333] hover:border-[#444]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                    className="accent-emerald-500"
                  />
                  <span className="text-lg">{event.icon}</span>
                  <span className="text-sm text-zinc-300">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Last Test Info */}
          {slack?.lastTestedAt && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <RefreshCw className="w-3 h-3" />
              Zuletzt getestet:{" "}
              {new Date(slack.lastTestedAt).toLocaleString("de-DE")}
              {slack.lastError && (
                <span className="text-red-400 ml-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {slack.lastError}
                </span>
              )}
            </div>
          )}

          {/* Result Message */}
          {testResult && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm p-3 rounded-lg",
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              )}
            >
              {testResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={testing || !slack?.webhookUrlSet}
              className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] disabled:opacity-50 text-zinc-300 text-sm rounded-md transition-colors border border-[#333]"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Test senden
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Speichern
            </button>
          </div>
        </div>
      </div>

      {/* Hinweise */}
      <div className="mt-6 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">
          📘 Slack Webhook einrichten
        </h3>
        <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
          <li>
            Öffne{" "}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              api.slack.com/apps
            </a>
          </li>
          <li>Erstelle eine neue App oder wähle eine bestehende</li>
          <li>
            Gehe zu <strong>Incoming Webhooks</strong> → Aktivieren
          </li>
          <li>
            Klicke <strong>Add New Webhook to Workspace</strong>
          </li>
          <li>Wähle den gewünschten Channel (z.B. #mission-control)</li>
          <li>Kopiere die Webhook URL und füge sie oben ein</li>
        </ol>
      </div>
    </div>
  );
}
