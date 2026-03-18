"use client";

import { useEffect } from "react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { LiveActivityFeed } from "@/components/tasks/LiveActivityFeed";
import { useAppStore, type Task, type Project, type User } from "@/store/useAppStore";

interface KanbanBoardWrapperProps {
  initialTasks: Task[];
  projects: Project[];
  users: User[];
}

export function KanbanBoardWrapper({ initialTasks, projects, users }: KanbanBoardWrapperProps) {
  const { setTasks, setProjects, setUsers } = useAppStore();

  useEffect(() => {
    setTasks(initialTasks);
    setProjects(projects);
    setUsers(users);
  }, []);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <KanbanBoard projects={projects} users={users} />
      </div>
      <LiveActivityFeed />
    </div>
  );
}
