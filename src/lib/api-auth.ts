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
}

/**
 * Try to authenticate via API key (Bearer mc_live_...) first,
 * then fall back to the normal NextAuth session.
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
    };
  }

  // Fallback: normal NextAuth session
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: (session.user as any).id ?? "",
    username: (session.user as any).username ?? session.user.name ?? "",
    role: (session.user as any).role ?? "user",
    projectAccess: (session.user as any).projectAccess ?? [],
  };
}
