import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface ApiSession {
  id: string;
  username: string;
  role: string;
  projectAccess: string[];
  permissions: string[];
}

/**
 * Try to authenticate via API key (Bearer mc_live_...) first,
 * then fall back to the normal NextAuth session.
 *
 * IMPORTANT: User data is ALWAYS loaded fresh from DB — never from the JWT/session cache.
 * This ensures that permission changes by an admin take effect immediately
 * without requiring the affected user to log out and back in.
 */
export async function getSessionOrApiKey(
  req: Request | import("next/server").NextRequest
): Promise<ApiSession | null> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer mc_live_")) {
    const rawKey = authHeader.slice(7); // strip "Bearer "
    const hash = sha256(rawKey);

    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!apiKey) {
      console.warn("[api-auth] API key not found for hash");
      return null;
    }

    // Check expiry
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      console.warn("[api-auth] API key expired:", apiKey.id);
      return null;
    }

    // Update lastUsedAt (fire-and-forget)
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch((e) => console.error("[api-auth] Failed to update lastUsedAt", e));

    // Always load user fresh from DB — never trust cached data
    const user = await prisma.authUser.findUnique({ where: { id: apiKey.userId } });
    if (!user) {
      console.warn("[api-auth] User not found for API key userId:", apiKey.userId);
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      projectAccess: user.projectAccess,
      permissions: user.permissions ?? [],
    };
  }

  // Fallback: NextAuth session — but ALWAYS load user fresh from DB.
  // The JWT only contains the user ID; permissions/role come from a live DB query
  // so that admin changes take effect immediately without requiring re-login.
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (!user) {
    console.warn("[api-auth] User not found for session id:", session.user.id);
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    projectAccess: user.projectAccess,
    permissions: user.permissions ?? [],
  };
}

/**
 * Load the currently authenticated user from DB and verify they have the admin role.
 * Uses a live DB lookup so role changes take effect immediately.
 */
export async function requireAdminFromDb(): Promise<import("@prisma/client").AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "admin") return null;

  return user;
}
