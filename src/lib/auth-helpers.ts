// Shim: Re-export from api-auth for backwards compatibility
export { getSessionOrApiKey, requireAdminFromDb, sha256 } from "./api-auth";
export type { ApiSession } from "./api-auth";

import { auth } from "./auth";

/**
 * Simple session check for server components/routes.
 * Returns the session if authenticated, null otherwise.
 */
export async function requireServerSession() {
  const session = await auth();
  return session;
}
