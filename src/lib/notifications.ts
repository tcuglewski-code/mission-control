import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "task_assigned"
  | "task_status_changed"
  | "comment_added"
  | "milestone_due"
  | "sprint_completed"
  | "mention"
  | "new_email";

/**
 * Erstellt eine Benachrichtigung für einen Benutzer.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link ?? null,
        read: false,
      },
    });
  } catch (err) {
    console.error("[createNotification] Fehler:", err);
  }
}

/**
 * Gibt alle Mitglieder eines Projekts zurück (AuthUser-IDs).
 */
export async function getProjectMemberIds(projectId: string): Promise<string[]> {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  // ProjectMember.userId → User.id (nicht AuthUser.id)
  // Wir nutzen die Emails als Brücke
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return [];

  // User → AuthUser über Email verknüpfen
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });
  const emails = users.map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return [];

  const authUsers = await prisma.authUser.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  return authUsers.map((u) => u.id);
}

/**
 * Gibt die AuthUser-ID für eine gegebene User-ID (Task assignee etc.) zurück.
 */
export async function getAuthUserIdByUserId(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return null;
    const authUser = await prisma.authUser.findFirst({
      where: { email: user.email },
      select: { id: true },
    });
    return authUser?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Extrahiert @Mentions aus einem Text.
 * Gibt eine Liste von Namen zurück (ohne @).
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([\w\-äöüÄÖÜß]+)/g) ?? [];
  return matches.map((m) => m.slice(1));
}

/**
 * Findet AuthUser-IDs anhand von Namen (partial match).
 */
export async function findUsersByMentionNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const authUsers = await prisma.authUser.findMany({
    select: { id: true, username: true },
  });
  const result: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    const matched = authUsers.filter(
      (u) => u.username.toLowerCase().includes(lower)
    );
    result.push(...matched.map((u) => u.id));
  }
  // Deduplizieren
  return [...new Set(result)];
}
