"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, Globe, RefreshCw, Settings, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UptimeCheck {
  id: string;
  status: string;
  statusCode?: number;
  responseTime?: number;
  checkedAt: string;
  error?: string;
}

interface Tenant {
  id: string;
  tenantId: string;
  tenantName: string;
  url: string;
  enabled: boolean;
  timeout: number;
  alertOnDown: boolean;
  lastStatus: string | null;
  lastCheckedAt: string | null;
  consecutiveFails: number;
  uptime24h: number;
  recentChecks: UptimeCheck[];
}

interface Stats {
  totalChecks24h: number;
  successfulChecks24h: number;
  failedChecks24h: number;
  uptime24h: number;
  avgResponseTime24h: number;
}

export default function MonitoringPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/monitoring");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants ?? []);
        setStats(data.stats ?? null);
        setTelegramConfigured(data.telegramConfigured ?? false);
      }
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-Refresh alle 60 Sekunden
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerManualCheck = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/cron/uptime", { method: "POST" });
      await loadData();
    } catch (err) {
      console.error("Fehler beim manuellen Check:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleEnabled = async (tenant: Tenant) => {
    try {
      await fetch("/api/monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tenant.id, enabled: !tenant.enabled }),
      });
      await loadData();
    } catch (err) {
      console.error("Fehler beim Umschalten:", err);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "up":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "timeout":
        return <Clock className="w-5 h-5 text-amber-400" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "up":
        return "bg-emerald-500";
      case "down":
        return "bg-red-500";
      case "timeout":
        return "bg-amber-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-zinc-500";
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return "text-emerald-400";
    if (uptime >= 99) return "text-emerald-500";
    if (uptime >= 95) return "text-amber-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Uptime Monitoring
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
            Überwache alle Tenant-Systeme in Echtzeit
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!telegramConfigured && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Telegram nicht konfiguriert
            </div>
          )}
          <button
            onClick={triggerManualCheck}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Jetzt prüfen
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#161616] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Uptime (24h)</p>
            <p className={cn("text-2xl font-bold", getUptimeColor(stats.uptime24h))}>
              {stats.uptime24h}%
            </p>
          </div>
          <div className="bg-white dark:bg-[#161616] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Checks (24h)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalChecks24h}</p>
          </div>
          <div className="bg-white dark:bg-[#161616] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Fehler (24h)</p>
            <p className="text-2xl font-bold text-red-400">{stats.failedChecks24h}</p>
          </div>
          <div className="bg-white dark:bg-[#161616] rounded-xl p-4 border border-gray-200 dark:border-[#2a2a2a]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Ø Response</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgResponseTime24h}ms</p>
          </div>
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            className={cn(
              "bg-white dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden transition-all hover:border-emerald-500/50",
              !tenant.enabled && "opacity-50"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(tenant.lastStatus)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tenant.tenantName}</h3>
                    <a
                      href={tenant.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      {tenant.url.replace("https://", "").split("/")[0]}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => toggleEnabled(tenant)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    tenant.enabled ? "bg-emerald-500" : "bg-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                      tenant.enabled ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-500">Uptime (24h)</span>
                <span className={cn("font-medium", getUptimeColor(tenant.uptime24h))}>
                  {tenant.uptime24h}%
                </span>
              </div>

              {tenant.consecutiveFails > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{tenant.consecutiveFails}x Fehler in Folge</span>
                </div>
              )}

              {tenant.lastCheckedAt && (
                <p className="text-xs text-gray-500 dark:text-zinc-600">
                  Letzter Check: {new Date(tenant.lastCheckedAt).toLocaleString("de-DE")}
                </p>
              )}

              {/* Mini Timeline */}
              {tenant.recentChecks.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">Letzte 10 Checks</p>
                  <div className="flex gap-1">
                    {tenant.recentChecks.slice(0, 10).reverse().map((check, i) => (
                      <div
                        key={check.id}
                        className={cn("flex-1 h-6 rounded-sm", getStatusColor(check.status))}
                        title={`${check.status}${check.responseTime ? ` (${check.responseTime}ms)` : ""} - ${new Date(check.checkedAt).toLocaleString("de-DE")}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-zinc-600">
                Timeout: {tenant.timeout}s
              </span>
              {tenant.alertOnDown ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Alerts aktiv
                </span>
              ) : (
                <span className="text-zinc-500">Alerts deaktiviert</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-16">
          <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-zinc-500">Keine Monitoring-Konfigurationen vorhanden.</p>
          <p className="text-xs text-gray-500 dark:text-zinc-600 mt-2">
            Der nächste Cron-Lauf wird automatisch Standard-Tenants anlegen.
          </p>
        </div>
      )}

      {/* Telegram Konfiguration Hinweis */}
      {!telegramConfigured && (
        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h3 className="font-medium text-amber-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Telegram-Alerts einrichten
          </h3>
          <p className="text-sm text-zinc-400 mb-3">
            Um Telegram-Alerts zu aktivieren, füge diese ENV-Variablen in Vercel hinzu:
          </p>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-zinc-300 space-y-1">
            <p>TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz</p>
            <p>TELEGRAM_CHAT_ID=-1001234567890</p>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Erstelle einen Bot via @BotFather und füge ihn zu einer Gruppe hinzu.
            Die Chat-ID findest du via @getidsbot.
          </p>
        </div>
      )}
    </div>
  );
}
