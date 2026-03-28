import { prisma } from './prisma';

/**
 * Universeller Audit-Logger für Mission Control.
 * Schreibt in ActivityLog – feuert-und-vergisst, wirft nie.
 */
export async function logActivity({
  userId,
  userEmail,
  action,
  resource,
  resourceId,
  resourceName,
  projectId,
  details,
  ipAddress,
}: {
  userId?: string;
  userEmail?: string;
  /** z.B. 'create' | 'update' | 'delete' | 'login' | 'webhook' */
  action: string;
  /** z.B. 'task' | 'project' | 'user' | 'sprint' */
  resource: string;
  resourceId?: string;
  resourceName?: string;
  projectId?: string;
  details?: object;
  ipAddress?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType: resource,
        entityId: resourceId ?? 'unknown',
        entityName: resourceName ?? resourceId ?? resource,
        userId: userId ?? null,
        userEmail: userEmail ?? null,
        projectId: projectId ?? null,
        details: details ?? null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (e) {
    console.error('[Audit] Log fehlgeschlagen:', e);
  }
}
