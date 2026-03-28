"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useWidgetConfig } from "@/hooks/useWidgetConfig";
import { DashboardConfigPanel } from "./DashboardConfigPanel";
import { StatsRow } from "./StatsRow";

// Widget components
import { OffeneTasksWidget } from "./widgets/OffeneTasksWidget";
import { MeineTasksWidget } from "./widgets/MeineTasksWidget";
import { ProjekteUebersichtWidget } from "./widgets/ProjekteUebersichtWidget";
import { LetzteAktivitaetWidget } from "./widgets/LetzteAktivitaetWidget";
import { MeilensteinWidget } from "./widgets/MeilensteinWidget";
import { ZeiterfassungHeuteWidget } from "./widgets/ZeiterfassungHeuteWidget";
import { TeamAuslastungWidget } from "./widgets/TeamAuslastungWidget";
import { BudgetUebersichtWidget } from "./widgets/BudgetUebersichtWidget";
import { AktuellerSprintWidget } from "./widgets/AktuellerSprintWidget";
import { ZuletztBesuchtWidget } from "./widgets/ZuletztBesuchtWidget";
import { LiveFeedWidget } from "./widgets/LiveFeedWidget";

// --- Shared types (serialized from server) ---

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  project?: { name: string; color: string } | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  color: string;
  budget?: number | null;
  budgetUsed?: number | null;
  _count?: { tasks: number };
}

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  createdAt: Date | string;
  user?: { name: string; avatar?: string | null } | null;
}

interface MilestoneItem {
  id: string;
  title: string;
  status: string;
  progress: number;
  color: string;
  dueDate?: Date | string | null;
  project: { name: string };
}

interface TimeEntry {
  id: string;
  description?: string | null;
  duration?: number | null;
  startTime: Date | string;
  endTime?: Date | string | null;
  task: { title: string; project?: { name: string; color: string } | null };
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string | null;
  openTaskCount: number;
}

export interface DashboardClientProps {
  // Stats
  activeProjectsCount: number;
  openTasksCount: number;
  teamCount: number;
  activityToday: number;

  // Widget data
  openTasks: Task[];
  myTasks: Task[];
  projects: Project[];
  activityLogs: ActivityLog[];
  milestones: MilestoneItem[];
  timeEntriesToday: TimeEntry[];
  totalMinutesToday: number;
  teamMembers: TeamMember[];
  budgetProjects: Project[];
}

export function DashboardClient({
  activeProjectsCount,
  openTasksCount,
  teamCount,
  activityToday,
  openTasks,
  myTasks,
  projects,
  activityLogs,
  milestones,
  timeEntriesToday,
  totalMinutesToday,
  teamMembers,
  budgetProjects,
}: DashboardClientProps) {
  const { config, visibleWidgets, toggleWidget, reorderWidgets, resetConfig } =
    useWidgetConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const renderWidget = (id: string) => {
    switch (id) {
      case "offene-tasks":
        return (
          <OffeneTasksWidget
            tasks={openTasks as Task[]}
            totalCount={openTasksCount}
          />
        );
      case "meine-tasks":
        return <MeineTasksWidget tasks={myTasks as Task[]} />;
      case "projekte-uebersicht":
        return <ProjekteUebersichtWidget projects={projects as Project[]} />;
      case "letzte-aktivitaet":
        return <LetzteAktivitaetWidget logs={activityLogs as ActivityLog[]} />;
      case "meilensteine":
        return <MeilensteinWidget milestones={milestones as MilestoneItem[]} />;
      case "zeiterfassung-heute":
        return (
          <ZeiterfassungHeuteWidget
            entries={timeEntriesToday as TimeEntry[]}
            totalMinutes={totalMinutesToday}
          />
        );
      case "team-auslastung":
        return <TeamAuslastungWidget members={teamMembers} />;
      case "budget-uebersicht":
        return <BudgetUebersichtWidget projects={budgetProjects as Project[]} />;
      case "aktueller-sprint":
        return <AktuellerSprintWidget />;
      case "zuletzt-besucht":
        return <ZuletztBesuchtWidget />;
      case "live-feed":
        return <LiveFeedWidget />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Stats row + customize button */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:gap-4">
        <div className="flex-1 min-w-0">
          <StatsRow
            activeProjects={activeProjectsCount}
            openTasks={openTasksCount}
            teamMembers={teamCount}
            activityToday={activityToday}
          />
        </div>
        <button
          onClick={() => setConfigOpen(true)}
          className="shrink-0 flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] hover:border-[#3a3a3a] hover:bg-[#222] text-sm text-zinc-400 hover:text-white transition-all"
          title="Dashboard anpassen"
        >
          <Settings2 className="w-4 h-4" />
          <span>Dashboard anpassen</span>
        </button>
      </div>

      {/* Widget grid */}
      {visibleWidgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Settings2 className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-400 font-medium">Keine Widgets sichtbar</p>
          <p className="text-zinc-600 text-sm mt-1">
            Klicke auf &ldquo;Dashboard anpassen&rdquo; um Widgets einzublenden.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleWidgets.map((w) => {
            const node = renderWidget(w.id);
            if (!node) return null;
            return (
              <div key={w.id} className="min-h-[200px]">
                {node}
              </div>
            );
          })}
        </div>
      )}

      {/* Config panel */}
      {configOpen && (
        <DashboardConfigPanel
          config={config}
          onToggle={toggleWidget}
          onReorder={reorderWidgets}
          onReset={resetConfig}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}
