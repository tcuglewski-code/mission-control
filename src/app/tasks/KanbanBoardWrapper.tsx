"use client";

import { useEffect } from "react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
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

  return <KanbanBoard projects={projects} users={users} />;
}
