"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  CreditCard,
  Users,
  TrendingUp,
  Webhook,
  ExternalLink,
  CheckCircle2,
  Circle,
  Github,
} from "lucide-react";

const kpis = [
  { label: "Merchants", value: "0", icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  { label: "MRR", value: "€0", icon: TrendingUp, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  { label: "Transaktionsvolumen", value: "€0", icon: CreditCard, color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30" },
  { label: "Aktive Webhooks", value: "0", icon: Webhook, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
];

const quickLinks = [
  { label: "Zipayo App", url: "https://swifttap-app.vercel.app", icon: ExternalLink },
  { label: "GitHub Repo", url: "https://github.com/tcuglewski-code/zipayo-app", icon: Github },
];

const statusBadges = [
  { label: "Live", ok: true },
  { label: "Stripe Connected", ok: true },
  { label: "Email (Resend)", ok: true },
];

const launchChecklist = [
  { label: "Domain konfiguriert", done: false },
  { label: "Repo-Rename (zipayo-app)", done: false },
  { label: "AVV (Auftragsverarbeitung)", done: false },
  { label: "Mobile App", done: false },
];

export default function ZipayoPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Zipayo — Payment Platform</h1>
            <p className="text-muted-foreground text-sm mt-1">Verwaltung und Status der Zipayo Zahlungsplattform</p>
          </div>
          <a
            href="https://swifttap-app.vercel.app/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Zum Merchant Dashboard
          </a>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-muted-foreground text-xs mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status & Quick Links */}
          <div className="bg-card border rounded-xl p-5 space-y-5">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Status</h2>
            <div className="flex flex-wrap gap-2">
              {statusBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    badge.ok
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {badge.label}
                </span>
              ))}
            </div>

            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground pt-2">Quick Links</h2>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Launch Checklist */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Launch Checklist</h2>
            <div className="space-y-3">
              {launchChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {launchChecklist.filter((i) => i.done).length} / {launchChecklist.length} erledigt
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
