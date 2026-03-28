"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

// ─── Farben ───────────────────────────────────────────────────────────────────
const WALD_GRUEN = "#2C3A1C";
const GOLD = "#C5A55A";
const HELL_GRUEN = "#3D5226";
const WEISS = "#FFFFFF";
const HELL_GRAU = "#F5F5F0";
const DUNKEL_GRAU = "#333333";
const MITTEL_GRAU = "#666666";
const LEICHT_GRAU = "#E8E8E0";

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: WEISS,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: DUNKEL_GRAU,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: WALD_GRUEN,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: WALD_GRUEN,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: MITTEL_GRAU,
    marginBottom: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  kwBadge: {
    backgroundColor: GOLD,
    color: WEISS,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 9,
    color: MITTEL_GRAU,
    textAlign: "right",
  },

  // Status Badge
  statusBadge: {
    backgroundColor: HELL_GRUEN,
    color: WEISS,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    alignSelf: "flex-start",
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    backgroundColor: WALD_GRUEN,
    color: WEISS,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    borderRadius: 3,
  },

  // Stat Grid
  statGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: HELL_GRAU,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: LEICHT_GRAU,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: WALD_GRUEN,
    marginBottom: 2,
  },
  statNumberGold: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    marginBottom: 2,
  },
  statNumberBlue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    marginBottom: 2,
  },
  statNumberRed: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#ef4444",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: MITTEL_GRAU,
    textAlign: "center",
  },

  // Progress Bar
  progressContainer: {
    marginBottom: 10,
  },
  progressLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
    color: MITTEL_GRAU,
  },
  progressBar: {
    height: 8,
    backgroundColor: LEICHT_GRAU,
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: WALD_GRUEN,
    borderRadius: 4,
  },

  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: HELL_GRAU,
    borderBottomWidth: 1,
    borderBottomColor: LEICHT_GRAU,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MITTEL_GRAU,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LEICHT_GRAU,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: HELL_GRAU,
    borderBottomWidth: 1,
    borderBottomColor: LEICHT_GRAU,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: DUNKEL_GRAU,
  },
  tableCellLight: {
    fontSize: 9,
    color: MITTEL_GRAU,
  },

  // Status Dots
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Member Grid
  memberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  memberCard: {
    backgroundColor: HELL_GRAU,
    borderWidth: 1,
    borderColor: LEICHT_GRAU,
    borderRadius: 6,
    padding: 8,
    width: "30%",
  },
  memberName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DUNKEL_GRAU,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 8,
    color: MITTEL_GRAU,
  },

  // Sprint Card
  sprintCard: {
    backgroundColor: HELL_GRAU,
    borderWidth: 1,
    borderColor: LEICHT_GRAU,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sprintName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DUNKEL_GRAU,
    marginBottom: 2,
  },
  sprintMeta: {
    fontSize: 8,
    color: MITTEL_GRAU,
  },
  sprintProgress: {
    alignItems: "flex-end",
  },
  sprintProgressText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WALD_GRUEN,
  },
  sprintProgressLabel: {
    fontSize: 8,
    color: MITTEL_GRAU,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: LEICHT_GRAU,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: MITTEL_GRAU,
  },
  footerLogo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WALD_GRUEN,
  },
  pageNumber: {
    fontSize: 8,
    color: MITTEL_GRAU,
  },
});

// ─── Typen ────────────────────────────────────────────────────────────────────

interface ReportData {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    progress: number;
    priority: string;
    color: string;
    stack?: string | null;
    githubRepo?: string | null;
    liveUrl?: string | null;
  };
  taskStats: {
    total: number;
    open: number;
    inProgress: number;
    inReview: number;
    done: number;
    blocked: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee?: string | null;
    sprint?: string | null;
    dueDate?: string | null;
    storyPoints?: number | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    role: string;
    userRole: string;
  }>;
  burndownData: Array<{
    sprintName: string;
    total: number;
    done: number;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  calendarWeek: number;
  weekRange: string;
  reportDate: string;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  backlog: "Backlog",
  in_progress: "In Arbeit",
  in_review: "Review",
  done: "Fertig",
  blocked: "Blockiert",
  active: "Aktiv",
  planning: "Planung",
  paused: "Pausiert",
  completed: "Abgeschlossen",
};

const PRIO_LABEL: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "#71717a",
  backlog: "#a1a1aa",
  in_progress: "#3b82f6",
  in_review: "#f59e0b",
  done: "#10b981",
  blocked: "#ef4444",
};

// ─── PDF Dokument ─────────────────────────────────────────────────────────────

function ProjectReportDocument({ data }: { data: ReportData }) {
  const { project, taskStats, tasks, members, burndownData, calendarWeek, weekRange, reportDate } = data;

  const doneTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const openTasks = tasks.filter((t) => t.status === "todo" || t.status === "backlog");
  const blockedTasks = tasks.filter((t) => t.status === "blocked");

  return (
    <Document
      title={`Projekt-Report: ${project.name} – KW ${calendarWeek}`}
      author="Mission Control – Koch Aufforstung GmbH"
      subject={`Wöchentlicher Status-Report`}
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{project.name}</Text>
            <Text style={styles.headerSubtitle}>Wöchentlicher Projekt-Report</Text>
            {project.description && (
              <Text style={[styles.headerSubtitle, { marginTop: 4, fontSize: 9 }]}>
                {project.description}
              </Text>
            )}
            <Text style={styles.statusBadge}>
              {STATUS_LABEL[project.status] ?? project.status}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.kwBadge}>KW {calendarWeek}</Text>
            <Text style={styles.headerDate}>{weekRange}</Text>
            <Text style={styles.headerDate}>Erstellt: {reportDate}</Text>
          </View>
        </View>

        {/* ── Statistiken ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📊 Sprint-Übersicht</Text>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.total}</Text>
              <Text style={styles.statLabel}>Tasks gesamt</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumberGold}>{taskStats.done}</Text>
              <Text style={styles.statLabel}>Fertig</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumberBlue}>{taskStats.inProgress}</Text>
              <Text style={styles.statLabel}>In Arbeit</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.open}</Text>
              <Text style={styles.statLabel}>Offen</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumberRed}>{taskStats.blocked}</Text>
              <Text style={styles.statLabel}>Blockiert</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabel}>
              <Text>Fortschritt</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", color: WALD_GRUEN }}>
                {project.progress}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
            </View>
          </View>
        </View>

        {/* ── Erledigte Tasks ── */}
        {doneTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>✅ Erledigt diese Woche ({doneTasks.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Assignee</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Sprint</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Priorität</Text>
              </View>
              {doneTasks.map((task, i) => (
                <View key={task.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{task.title}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1.5 }]}>{task.assignee ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{task.sprint ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{PRIO_LABEL[task.priority] ?? task.priority}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── In Arbeit ── */}
        {inProgressTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>🔄 In Arbeit ({inProgressTasks.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Assignee</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Sprint</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Priorität</Text>
              </View>
              {inProgressTasks.map((task, i) => (
                <View key={task.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{task.title}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1.5 }]}>{task.assignee ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{task.sprint ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{PRIO_LABEL[task.priority] ?? task.priority}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Blockiert ── */}
        {blockedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>🚫 Blockiert ({blockedTasks.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Assignee</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Sprint</Text>
              </View>
              {blockedTasks.map((task, i) => (
                <View key={task.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{task.title}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1.5 }]}>{task.assignee ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{task.sprint ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Burndown / Sprint-Status ── */}
        {burndownData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>🏃 Sprint-Fortschritt</Text>
            {burndownData.map((sprint, i) => {
              const pct = sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;
              return (
                <View key={i} style={styles.sprintCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sprintName}>{sprint.sprintName}</Text>
                    <Text style={styles.sprintMeta}>
                      Status: {STATUS_LABEL[sprint.status] ?? sprint.status}
                    </Text>
                  </View>
                  <View style={styles.sprintProgress}>
                    <Text style={styles.sprintProgressText}>{sprint.done}/{sprint.total}</Text>
                    <Text style={styles.sprintProgressLabel}>{pct}% erledigt</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Team ── */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>👥 Team-Mitglieder</Text>
            <View style={styles.memberGrid}>
              {members.map((m) => (
                <View key={m.id} style={styles.memberCard}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role} · {m.userRole}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Offene Tasks (gekürzt) ── */}
        {openTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>📋 Offen / Backlog ({openTasks.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Assignee</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Priorität</Text>
              </View>
              {openTasks.slice(0, 20).map((task, i) => (
                <View key={task.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{task.title}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1.5 }]}>{task.assignee ?? "—"}</Text>
                  <Text style={[styles.tableCellLight, { flex: 1 }]}>{PRIO_LABEL[task.priority] ?? task.priority}</Text>
                </View>
              ))}
              {openTasks.length > 20 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellLight, { flex: 1, fontFamily: "Helvetica-Oblique" }]}>
                    + {openTasks.length - 20} weitere Tasks…
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLogo}>🌲 Koch Aufforstung GmbH</Text>
          <Text style={styles.footerText}>Mission Control · Vertraulich</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ─── Download Button Komponente ───────────────────────────────────────────────

interface ProjectPDFButtonProps {
  projectId: string;
  projectName: string;
}

export function ProjectPDFButton({ projectId, projectName }: ProjectPDFButtonProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchAndDownload = async () => {
    if (reportData) return; // bereits geladen
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/report`);
      if (!res.ok) throw new Error("Report konnte nicht geladen werden");
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      setError("Fehler beim Laden des Reports");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <button
        onClick={() => setError(null)}
        className="flex items-center gap-1.5 text-xs text-red-400 px-2 py-1 rounded border border-red-500/30 transition-colors"
      >
        ⚠️ Fehler – Nochmal versuchen
      </button>
    );
  }

  if (!reportData) {
    return (
      <button
        onClick={handleFetchAndDownload}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-[#252525] border border-[#2a2a2a] transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Lade Report…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            PDF-Report
          </>
        )}
      </button>
    );
  }

  const filename = `report-${projectName.toLowerCase().replace(/\s+/g, "-")}-kw${reportData.calendarWeek}.pdf`;

  return (
    <PDFDownloadLink
      document={<ProjectReportDocument data={reportData} />}
      fileName={filename}
      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-[#252525] border border-emerald-500/30 transition-colors"
    >
      {({ loading: pdfLoading }) =>
        pdfLoading ? (
          "Generiere PDF…"
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            PDF herunterladen
          </>
        )
      }
    </PDFDownloadLink>
  );
}
