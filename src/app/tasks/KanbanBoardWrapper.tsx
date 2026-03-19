"use client";

import { useEffect, useState, useMemo } from "react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { LiveActivityFeed } from "@/components/tasks/LiveActivityFeed";
import { useAppStore, type Task, type Project, type User } from "@/store/useAppStore";

interface KanbanBoardWrapperProps {
  initialTasks: Task[];
  projects: Project[];
  users: User[];
}

const SPRINT_NAMES: Record<string, string> = {
  "sprint-0.1": "Sprint 0.1 — Datenmodell & DB-Schema",
  "sprint-0.2": "Sprint 0.2 — API Contract & Auth",
  "sprint-0.3": "Sprint 0.3 — Expo Setup",
  "sprint-1.1": "Sprint 1.1 — Login & Navigation",
  "sprint-1.2": "Sprint 1.2 — Auftragsmodul",
  "sprint-1.3": "Sprint 1.3 — Session-Onboarding",
  "sprint-1.4": "Sprint 1.4 — Tagesprotokoll",
  "sprint-1.5": "Sprint 1.5 — Signatur & Abnahme",
  "sprint-2.1": "Sprint 2.1 — Mitarbeiter-Modul",
  "sprint-2.2": "Sprint 2.2 — Dokumentencenter",
  "sprint-2.3": "Sprint 2.3 — Gruppen & Teams",
  "sprint-2.4": "Sprint 2.4 — Lager & Material",
  "sprint-2.5": "Sprint 2.5 — Statistiken",
  "sprint-3.1": "Sprint 3.1 — Offline-Modus",
  "sprint-3.2": "Sprint 3.2 — Karten & GPS",
  "sprint-3.3": "Sprint 3.3 — Push-Notifications",
  "sprint-3.4": "Sprint 3.4 — Export & Rechnung",
  "sprint-3.5": "Sprint 3.5 — Mehrsprachigkeit",
  "sprint-4.1": "Sprint 4.1 — Qualität",
  "sprint-4.2": "Sprint 4.2 — Security & DSGVO",
  "sprint-4.3": "Sprint 4.3 — Performance & App Store",
  "sprint-4.4": "Sprint 4.4 — Launch",
};

const PHASE_HEADERS: Record<string, string> = {
  "0": "⚙️ Phase 0 — Fundament",
  "1": "🌲 Phase 1 — MVP",
  "2": "👥 Phase 2 — People & Teams",
  "3": "🌐 Phase 3 — Advanced",
  "4": "🚀 Phase 4 — Launch",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
};

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-orange-500",
  in_review: "bg-blue-500",
  backlog: "bg-zinc-600",
};

function getSprintLabel(task: Task): string | null {
  if (!task.labels) return null;
  const parts = task.labels.split(",").map((l) => l.trim());
  return parts.find((l) => l.startsWith("sprint-")) ?? null;
}

function getPhaseFromSprint(sprint: string): string {
  const match = sprint.match(/^sprint-(\d+)\./);
  return match ? match[1] : "0";
}

function getSprintSortKey(sprint: string): number {
  const match = sprint.match(/^sprint-(\d+)\.(\d+)$/);
  if (!match) return 999;
  return parseFloat(`${match[1]}.${match[2]}`);
}

function SprintView({ tasks }: { tasks: Task[] }) {
  const sprintGroups: Record<string, Task[]> = {};
  const noSprintTasks: Task[] = [];

  for (const task of tasks) {
    const sprint = getSprintLabel(task);
    if (sprint) {
      if (!sprintGroups[sprint]) sprintGroups[sprint] = [];
      sprintGroups[sprint].push(task);
    } else {
      noSprintTasks.push(task);
    }
  }

  const sortedSprints = Object.keys(sprintGroups).sort(
    (a, b) => getSprintSortKey(a) - getSprintSortKey(b)
  );

  let lastPhase: string | null = null;

  return (
    <div className="overflow-y-auto h-full pb-8">
      <div className="max-w-3xl space-y-1">
        {sortedSprints.map((sprint) => {
          const phase = getPhaseFromSprint(sprint);
          const showPhaseHeader = phase !== lastPhase;
          lastPhase = phase;
          const sprintName = SPRINT_NAMES[sprint] ?? sprint;
          const sprintTasks = sprintGroups[sprint];
          const doneCount = sprintTasks.filter((t) => t.status === "done").length;

          return (
            <div key={sprint}>
              {showPhaseHeader && (
                <div className="pt-5 pb-2">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                    {PHASE_HEADERS[phase] ?? `Phase ${phase}`}
                  </div>
                  <div className="h-px bg-[#2a2a2a] mt-2" />
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-center gap-2 py-2">
                  <span className="text-sm font-semibold text-zinc-100">{sprintName}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto whitespace-nowrap">
                    {doneCount}/{sprintTasks.length}
                  </span>
                </div>
                <div className="space-y-1.5 pl-3 border-l border-[#2a2a2a]">
                  {sprintTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-zinc-600"}`}
                      />
                      <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {noSprintTasks.length > 0 && (
          <div>
            <div className="pt-5 pb-2">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Ohne Sprint
              </div>
              <div className="h-px bg-[#2a2a2a] mt-2" />
            </div>
            <div className="space-y-1.5">
              {noSprintTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-zinc-600"}`}
                  />
                  <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-12">Keine Tasks</p>
        )}
      </div>
    </div>
  );
}

const PRIORITY_OPTIONS = [
  { value: "", label: "Alle Prioritäten" },
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

export function KanbanBoardWrapper({ initialTasks, projects, users }: KanbanBoardWrapperProps) {
  const { tasks, setTasks, setProjects, setUsers } = useAppStore();
  const [view, setView] = useState<"kanban" | "sprint">("kanban");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");

  useEffect(() => {
    setTasks(initialTasks);
    setProjects(projects);
    setUsers(users);
  }, []);

  const activeTasks = tasks.length > 0 ? tasks : initialTasks;

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((t) => {
      if (filterProject && t.projectId !== filterProject) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    });
  }, [activeTasks, filterProject, filterPriority]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-1">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "kanban"
                ? "bg-[#2a2a2a] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("sprint")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "sprint"
                ? "bg-[#2a2a2a] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sprint-View
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3a3a3a] hover:border-[#3a3a3a] transition-colors"
          >
            <option value="">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3a3a3a] hover:border-[#3a3a3a] transition-colors"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {(filterProject || filterPriority) && (
            <button
              onClick={() => { setFilterProject(""); setFilterPriority(""); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg hover:bg-[#1c1c1c] border border-transparent hover:border-[#2a2a2a] transition-colors"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {view === "kanban" ? (
          <>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <KanbanBoard projects={projects} users={users} filteredTasks={filteredTasks} />
            </div>
            <LiveActivityFeed />
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <SprintView tasks={filteredTasks} />
            </div>
            <LiveActivityFeed />
          </>
        )}
      </div>
    </div>
  );
}
