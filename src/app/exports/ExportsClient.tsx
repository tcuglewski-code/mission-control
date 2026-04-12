"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Receipt,
  BarChart3,
  Users,
  Download,
  Calendar,
  Clock,
  Building2,
  TrendingDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
}

type ExportCategory = "tasks" | "time" | "invoices" | "analytics" | "team";

interface ExportOption {
  id: string;
  category: ExportCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  apiEndpoint?: string;
  format: string;
  projectFilter?: boolean;
}

const exportOptions: ExportOption[] = [
  // Tasks
  {
    id: "tasks-csv",
    category: "tasks",
    title: "Aufgaben (CSV)",
    description: "Alle Aufgaben mit Status, Priorität, Verantwortlichen und Labels",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    apiEndpoint: "/api/reports/export?type=tasks&format=csv",
    format: "CSV",
    projectFilter: true,
  },
  {
    id: "tasks-custom",
    category: "tasks",
    title: "Aufgaben (Spalten wählen)",
    description: "CSV-Export mit konfigurierbaren Spalten",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    href: "/reports/export",
    format: "CSV",
  },
  // Zeiterfassung
  {
    id: "time-csv",
    category: "time",
    title: "Zeiterfassung (CSV)",
    description: "Alle Zeitbuchungen mit Projekt, Task und Dauer",
    icon: <Clock className="w-5 h-5" />,
    apiEndpoint: "/api/reports/export?type=time&format=csv",
    format: "CSV",
    projectFilter: true,
  },
  {
    id: "time-datev",
    category: "time",
    title: "Zeiterfassung (DATEV)",
    description: "DATEV-kompatibles Format für Buchhaltung",
    icon: <Building2 className="w-5 h-5" />,
    href: "/time",
    format: "DATEV CSV",
  },
  // Rechnungen
  {
    id: "invoices-csv",
    category: "invoices",
    title: "Rechnungen (CSV)",
    description: "Alle Rechnungen als CSV-Tabelle",
    icon: <Receipt className="w-5 h-5" />,
    apiEndpoint: "/api/reports/export?type=invoices&format=csv",
    format: "CSV",
  },
  {
    id: "invoices-datev",
    category: "invoices",
    title: "Rechnungen (DATEV)",
    description: "DATEV Buchungsstapel-Format für Steuerberater",
    icon: <Building2 className="w-5 h-5" />,
    apiEndpoint: "/api/invoices/export",
    format: "DATEV CSV",
  },
  {
    id: "invoices-pdf",
    category: "invoices",
    title: "Rechnungen (Einzeln PDF)",
    description: "PDF-Export einzelner Rechnungen",
    icon: <FileText className="w-5 h-5" />,
    href: "/invoices",
    format: "PDF",
  },
  // Analytics
  {
    id: "burndown-chart",
    category: "analytics",
    title: "Burndown Charts",
    description: "Sprint-Fortschritt als interaktives Diagramm",
    icon: <TrendingDown className="w-5 h-5" />,
    href: "/analytics",
    format: "SVG/PNG",
  },
  {
    id: "weekly-report",
    category: "analytics",
    title: "Wochenbericht",
    description: "Zusammenfassung der Woche mit Statistiken",
    icon: <Calendar className="w-5 h-5" />,
    href: "/reports/weekly",
    format: "PDF/CSV",
  },
  // Team
  {
    id: "team-report",
    category: "team",
    title: "Projekt-Report (PDF)",
    description: "Vollständiger Projektbericht mit Team und Aufgaben",
    icon: <Users className="w-5 h-5" />,
    href: "/projects",
    format: "PDF",
  },
  {
    id: "my-week",
    category: "team",
    title: "Meine Woche",
    description: "Persönlicher Wochenexport mit Aufgaben und Zeitbuchungen",
    icon: <Calendar className="w-5 h-5" />,
    href: "/my-week",
    format: "CSV/PDF",
  },
];

const categoryInfo: Record<ExportCategory, { label: string; icon: React.ReactNode }> = {
  tasks: { label: "Aufgaben", icon: <FileSpreadsheet className="w-5 h-5" /> },
  time: { label: "Zeiterfassung", icon: <Clock className="w-5 h-5" /> },
  invoices: { label: "Rechnungen", icon: <Receipt className="w-5 h-5" /> },
  analytics: { label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
  team: { label: "Team & Reports", icon: <Users className="w-5 h-5" /> },
};

export function ExportsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data ?? []))
      .catch(() => {});
  }, []);

  const handleDownload = async (option: ExportOption) => {
    if (!option.apiEndpoint) return;

    setDownloading(option.id);
    try {
      let url = option.apiEndpoint;
      if (option.projectFilter && selectedProject !== "all") {
        url += url.includes("?") ? "&" : "?";
        url += `projectId=${selectedProject}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Download fehlgeschlagen");

      const blob = await response.blob();
      const filename =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `export-${option.id}-${new Date().toISOString().split("T")[0]}.csv`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      setRecentDownloads((prev) => [option.id, ...prev.filter((id) => id !== option.id)].slice(0, 5));
    } catch (err) {
      console.error("Download error:", err);
      alert("Download fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setDownloading(null);
    }
  };

  const categories = Object.keys(categoryInfo) as ExportCategory[];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Project Filter */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Projekt-Filter:
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            (gilt für Exporte mit Projekt-Filter)
          </span>
        </div>
      </div>

      {/* Recent Downloads */}
      {recentDownloads.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">Letzte Downloads:</span>
            {recentDownloads.slice(0, 3).map((id) => {
              const opt = exportOptions.find((o) => o.id === id);
              return opt ? (
                <span key={id} className="bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded text-xs">
                  {opt.title}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Export Categories */}
      {categories.map((category) => {
        const info = categoryInfo[category];
        const options = exportOptions.filter((o) => o.category === category);

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              {info.icon}
              <h2 className="text-lg font-semibold">{info.label}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                        {option.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {option.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {option.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                            {option.format}
                          </span>
                          {option.projectFilter && (
                            <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                              Projekt-Filter
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {option.apiEndpoint ? (
                      <button
                        onClick={() => handleDownload(option)}
                        disabled={downloading === option.id}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {downloading === option.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Lädt...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download
                          </>
                        )}
                      </button>
                    ) : option.href ? (
                      <Link
                        href={option.href}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Öffnen
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Quick Info */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-sm text-zinc-600 dark:text-zinc-400">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          💡 Tipps zum Export
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>DATEV-Exporte</strong> sind für die Übergabe an Steuerberater optimiert
          </li>
          <li>
            <strong>Projekt-Filter</strong> schränkt Exporte auf ein bestimmtes Projekt ein
          </li>
          <li>
            <strong>PDF-Reports</strong> werden auf den jeweiligen Detail-Seiten generiert
          </li>
          <li>
            Alle Exporte respektieren Ihre <Link href="/settings/permissions" className="text-emerald-600 hover:underline">Zugriffsrechte</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
