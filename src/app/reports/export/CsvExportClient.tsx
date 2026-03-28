"use client";

import { useState, useEffect } from "react";
import { Download, Settings2, CheckSquare, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

// ─── Spalten-Definitionen ──────────────────────────────────────────────────
const TASK_COLUMNS = [
  { id: "id", label: "ID" },
  { id: "title", label: "Titel" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priorität" },
  { id: "assignee", label: "Verantwortlich" },
  { id: "project", label: "Projekt" },
  { id: "sprint", label: "Sprint" },
  { id: "milestone", label: "Meilenstein" },
  { id: "dueDate", label: "Fälligkeitsdatum" },
  { id: "storyPoints", label: "Story Points" },
  { id: "labels", label: "Labels" },
  { id: "createdAt", label: "Erstellt am" },
  { id: "updatedAt", label: "Aktualisiert am" },
];

const TIME_COLUMNS = [
  { id: "id", label: "ID" },
  { id: "task", label: "Aufgabe" },
  { id: "project", label: "Projekt" },
  { id: "user", label: "Mitarbeiter" },
  { id: "description", label: "Beschreibung" },
  { id: "date", label: "Datum" },
  { id: "duration", label: "Dauer (Min.)" },
  { id: "billable", label: "Abrechenbar" },
];

const INVOICE_COLUMNS = [
  { id: "number", label: "Rechnungsnummer" },
  { id: "date", label: "Datum" },
  { id: "dueDate", label: "Fälligkeitsdatum" },
  { id: "client", label: "Kunde" },
  { id: "project", label: "Projekt" },
  { id: "description", label: "Beschreibung" },
  { id: "netto", label: "Nettobetrag (€)" },
  { id: "mwst", label: "MwSt (€)" },
  { id: "brutto", label: "Bruttobetrag (€)" },
  { id: "status", label: "Status" },
  { id: "paidAt", label: "Bezahlt am" },
];

type ExportType = "tasks" | "time" | "invoices";

const TYPE_INFO: Record<
  ExportType,
  { label: string; icon: React.ReactNode; columns: Array<{ id: string; label: string }>; storageKey: string }
> = {
  tasks: {
    label: "Tasks",
    icon: <CheckSquare className="w-4 h-4" />,
    columns: TASK_COLUMNS,
    storageKey: "csv_columns_tasks",
  },
  time: {
    label: "Zeiterfassung",
    icon: <Clock className="w-4 h-4" />,
    columns: TIME_COLUMNS,
    storageKey: "csv_columns_time",
  },
  invoices: {
    label: "Rechnungen",
    icon: <FileText className="w-4 h-4" />,
    columns: INVOICE_COLUMNS,
    storageKey: "csv_columns_invoices",
  },
};

function loadColumns(storageKey: string, allColumns: string[]): string[] {
  if (typeof window === "undefined") return allColumns;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // Nur gültige IDs behalten
      return parsed.filter((id) => allColumns.includes(id));
    }
  } catch {}
  return allColumns;
}

function saveColumns(storageKey: string, columns: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch {}
}

export function CsvExportClient() {
  const [activeType, setActiveType] = useState<ExportType>("tasks");
  const [selectedColumns, setSelectedColumns] = useState<Record<ExportType, string[]>>({
    tasks: TASK_COLUMNS.map((c) => c.id),
    time: TIME_COLUMNS.map((c) => c.id),
    invoices: INVOICE_COLUMNS.map((c) => c.id),
  });

  // Aus LocalStorage laden beim Mount
  useEffect(() => {
    setSelectedColumns({
      tasks: loadColumns(
        TYPE_INFO.tasks.storageKey,
        TASK_COLUMNS.map((c) => c.id)
      ),
      time: loadColumns(
        TYPE_INFO.time.storageKey,
        TIME_COLUMNS.map((c) => c.id)
      ),
      invoices: loadColumns(
        TYPE_INFO.invoices.storageKey,
        INVOICE_COLUMNS.map((c) => c.id)
      ),
    });
  }, []);

  const info = TYPE_INFO[activeType];
  const currentColumns = selectedColumns[activeType];

  const toggleColumn = (colId: string) => {
    const updated = currentColumns.includes(colId)
      ? currentColumns.filter((c) => c !== colId)
      : [...currentColumns, colId];
    const newState = { ...selectedColumns, [activeType]: updated };
    setSelectedColumns(newState);
    saveColumns(info.storageKey, updated);
  };

  const selectAll = () => {
    const all = info.columns.map((c) => c.id);
    const newState = { ...selectedColumns, [activeType]: all };
    setSelectedColumns(newState);
    saveColumns(info.storageKey, all);
  };

  const selectNone = () => {
    const newState = { ...selectedColumns, [activeType]: [] };
    setSelectedColumns(newState);
    saveColumns(info.storageKey, []);
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const filenameMap: Record<ExportType, string> = {
    tasks: `tasks-${today}.csv`,
    time: `zeiterfassung-${today}.csv`,
    invoices: `rechnungen-${today}.csv`,
  };

  const exportUrl =
    currentColumns.length > 0
      ? `/api/reports/export?type=${activeType}&format=csv&columns=${currentColumns.join(",")}`
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">CSV / Excel Export</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Wähle den Exporttyp und die gewünschten Spalten. Die Auswahl wird automatisch gespeichert.
        </p>
      </div>

      {/* Typ-Auswahl */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Exporttyp</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TYPE_INFO) as [ExportType, (typeof TYPE_INFO)[ExportType]][]).map(
            ([type, config]) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  activeType === type
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-[#161616] border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-[#3a3a3a]"
                }`}
              >
                {config.icon}
                {config.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Spalten-Auswahl */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Spalten für &quot;{info.label}&quot;
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Alle wählen
            </button>
            <span className="text-zinc-600">·</span>
            <button
              onClick={selectNone}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Keine
            </button>
            <span className="text-xs text-zinc-600">
              {currentColumns.length}/{info.columns.length}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {info.columns.map((col) => {
            const isSelected = currentColumns.includes(col.id);
            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors text-left ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-[#161616] border-[#2a2a2a] text-zinc-500 hover:text-zinc-300 hover:border-[#3a3a3a]"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {col.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vorschau + Download */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Export</h2>

        {currentColumns.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-3">
            Bitte mindestens eine Spalte auswählen.
          </p>
        ) : (
          <>
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3 mb-4">
              <p className="text-xs text-zinc-500 mb-1">Dateiname:</p>
              <p className="text-sm font-mono text-zinc-300">{filenameMap[activeType]}</p>
              <p className="text-xs text-zinc-500 mt-2 mb-1">Enthaltene Spalten:</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {currentColumns
                  .map((id) => info.columns.find((c) => c.id === id)?.label ?? id)
                  .join(" · ")}
              </p>
            </div>

            <a
              href={exportUrl ?? "#"}
              download={filenameMap[activeType]}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              {filenameMap[activeType]} herunterladen
            </a>
          </>
        )}
      </div>

      {/* Schnell-Links */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-3">Schnell-Export (alle Spalten):</p>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`/api/reports/export?type=tasks&format=csv`}
            className="text-xs text-zinc-400 hover:text-white underline transition-colors"
          >
            tasks-{today}.csv
          </a>
          <a
            href={`/api/reports/export?type=time&format=csv`}
            className="text-xs text-zinc-400 hover:text-white underline transition-colors"
          >
            zeiterfassung-{today}.csv
          </a>
          <a
            href={`/api/reports/export?type=invoices&format=csv`}
            className="text-xs text-zinc-400 hover:text-white underline transition-colors"
          >
            rechnungen-{today}.csv
          </a>
        </div>
      </div>
    </div>
  );
}
