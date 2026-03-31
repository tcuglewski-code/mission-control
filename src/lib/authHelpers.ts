// Shim: Re-export from api-auth for backwards compatibility
export { getSessionOrApiKey, requireAdminFromDb, sha256 } from "./api-auth";
export type { ApiSession } from "./api-auth";
