"use client";

import { create } from "zustand";

export interface Sprint {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  goal?: string | null;
  projectId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: string; name: string; color: string } | null;
  tasks?: { id: string; status: string; title: string }[];
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  progress: number;
  calculatedProgress?: number;
  color: string;
  dueDate?: string | null;
  projectId: string;
  project?: { id: string; name: string; color: string };
  taskStats?: { total: number; done: number };
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  labels?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  agentPrompt?: string | null;
  timeSpentSeconds?: number;
  storyPoints?: number | null;
  projectId?: string | null;
  assigneeId?: string | null;
  sprintId?: string | null;
  milestoneId?: string | null;
  sourceEmailId?: string | null;
  // Wiederkehrende Tasks
  recurring?: boolean;
  recurringInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  recurringDay?: number | null;
  recurringEndDate?: Date | null;
  parentTaskId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; name: string; avatar?: string | null } | null;
  sprint?: { id: string; name: string } | null;
  milestone?: { id: string; title: string; color: string } | null;
  taskLabels?: { label: Label }[] | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  longDescription?: string | null;
  status: string;
  progress: number;
  priority: string;
  color: string;
  stack?: string | null;
  githubRepo?: string | null;
  liveUrl?: string | null;
  vercelUrl?: string | null;
  expoProjectId?: string | null;
  archived?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tasks: number; members: number };
  members?: { user: { id: string; name: string; avatar?: string | null } }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  color: string;
  startTime: Date;
  endTime?: Date | null;
  recurring?: string | null;
  taskId?: string | null;
}

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string | null;
  source?: string | null;
  projectId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  tags?: string | null;
  projectId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  project?: { name: string } | null;
}

export interface Tool {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  config?: string | null;
  projectIds?: string | null;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId?: string | null;
  projectId?: string | null;
  metadata?: string | null;
  createdAt: Date;
  user?: { name: string; avatar?: string | null } | null;
}

interface AppState {
  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  updateTaskTime: (taskId: string, timeSpentSeconds: number) => void;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // Users
  users: User[];
  setUsers: (users: User[]) => void;

  // Events
  events: Event[];
  setEvents: (events: Event[]) => void;

  // Memory
  memoryEntries: MemoryEntry[];
  setMemoryEntries: (entries: MemoryEntry[]) => void;

  // Documents
  documents: Document[];
  setDocuments: (documents: Document[]) => void;

  // Tools
  tools: Tool[];
  setTools: (tools: Tool[]) => void;

  // Activity
  activityLogs: ActivityLog[];
  setActivityLogs: (logs: ActivityLog[]) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status } : t
      ),
    })),
  updateTaskTime: (taskId, timeSpentSeconds) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, timeSpentSeconds } : t
      ),
    })),

  projects: [],
  setProjects: (projects) => set({ projects }),

  users: [],
  setUsers: (users) => set({ users }),

  events: [],
  setEvents: (events) => set({ events }),

  memoryEntries: [],
  setMemoryEntries: (memoryEntries) => set({ memoryEntries }),

  documents: [],
  setDocuments: (documents) => set({ documents }),

  tools: [],
  setTools: (tools) => set({ tools }),

  activityLogs: [],
  setActivityLogs: (activityLogs) => set({ activityLogs }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
