import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/apidocs
 * Returns JSON API documentation for all available endpoints.
 * External agents can query this to understand the API surface.
 */
export async function GET(_req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://mission-control-tawny-omega.vercel.app";

  const docs = {
    title: "Mission Control API",
    version: "1.0.0",
    baseUrl,
    authentication: {
      description:
        "All endpoints support two authentication methods: NextAuth session cookie (browser) or API key via Bearer token header.",
      apiKey: {
        header: "Authorization",
        format: "Bearer mc_live_<64-hex-chars>",
        example: `curl -H "Authorization: Bearer mc_live_abc123..." ${baseUrl}/api/tasks`,
        note: "API keys are created by admins at /admin/users (API-Keys tab). The plaintext key is only shown once at creation time.",
      },
    },
    endpoints: [
      {
        method: "GET",
        path: "/api/projects",
        description: "List all projects (filtered by user's projectAccess if role=user)",
        auth: "session or API key",
        queryParams: [{ name: "status", type: "string", optional: true, values: ["active", "planning", "completed", "archived"] }],
        example: `curl -H "Authorization: Bearer mc_live_..." ${baseUrl}/api/projects`,
        response: "Array of project objects",
      },
      {
        method: "GET",
        path: "/api/tasks",
        description: "List tasks (filtered by project access for non-admin users)",
        auth: "session or API key",
        queryParams: [
          { name: "status", type: "string", optional: true, values: ["todo", "in_progress", "done", "backlog"] },
          { name: "projectId", type: "string", optional: true },
        ],
        example: `curl -H "Authorization: Bearer mc_live_..." ${baseUrl}/api/tasks?status=in_progress`,
        response: "Array of task objects with project and assignee",
      },
      {
        method: "POST",
        path: "/api/tasks",
        description: "Create a new task",
        auth: "session or API key",
        body: {
          title: "string (required)",
          description: "string (optional)",
          status: "string (optional, default: backlog)",
          priority: "string (optional, default: medium) — low|medium|high|urgent",
          labels: "string (optional, comma-separated)",
          dueDate: "ISO datetime string (optional)",
          projectId: "string (optional)",
          assigneeId: "string (optional)",
        },
        example: `curl -X POST -H "Authorization: Bearer mc_live_..." -H "Content-Type: application/json" \\
  -d '{"title":"My Task","status":"todo","priority":"high","projectId":"clxxx"}' \\
  ${baseUrl}/api/tasks`,
        response: "Created task object",
      },
      {
        method: "PATCH",
        path: "/api/tasks/:id",
        description: "Update a task (partial update)",
        auth: "session or API key",
        body: {
          title: "string (optional)",
          description: "string (optional)",
          status: "string (optional)",
          priority: "string (optional)",
          labels: "string (optional)",
          dueDate: "ISO datetime string or null (optional)",
          projectId: "string or null (optional)",
          assigneeId: "string or null (optional)",
          timeSpentSeconds: "number (optional)",
        },
        example: `curl -X PATCH -H "Authorization: Bearer mc_live_..." -H "Content-Type: application/json" \\
  -d '{"status":"done"}' \\
  ${baseUrl}/api/tasks/clxxx`,
        response: "Updated task object",
      },
      {
        method: "GET",
        path: "/api/memory",
        description: "List memory entries (knowledge base / journal)",
        auth: "session or API key",
        queryParams: [
          { name: "category", type: "string", optional: true },
          { name: "type", type: "string", optional: true, values: ["journal", "longterm"] },
          { name: "search", type: "string", optional: true },
        ],
        example: `curl -H "Authorization: Bearer mc_live_..." ${baseUrl}/api/memory?type=longterm`,
        response: "Array of memory entry objects",
      },
      {
        method: "POST",
        path: "/api/memory",
        description: "Create a memory entry",
        auth: "session or API key",
        body: {
          title: "string (required)",
          content: "string (required)",
          category: "string (optional, default: general)",
          type: "string (optional, default: journal) — journal|longterm",
          tags: "string (optional, comma-separated)",
          source: "string (optional, e.g. agent name)",
          projectId: "string (optional)",
        },
        example: `curl -X POST -H "Authorization: Bearer mc_live_..." -H "Content-Type: application/json" \\
  -d '{"title":"Important Note","content":"Agent completed task X","type":"longterm","source":"claude-agent"}' \\
  ${baseUrl}/api/memory`,
        response: "Created memory entry object",
      },
    ],
    adminEndpoints: [
      {
        method: "GET",
        path: "/api/admin/api-keys",
        description: "List all API keys (admin only)",
        auth: "admin session",
        response: "Array of API key objects (keyHash excluded)",
      },
      {
        method: "POST",
        path: "/api/admin/api-keys",
        description: "Create a new API key (admin only). Returns plaintext key ONCE.",
        auth: "admin session",
        body: {
          name: "string (required)",
          userId: "string (required) — AuthUser ID",
          expiresAt: "ISO datetime string (optional)",
        },
        response: "{ id, name, keyPrefix, userId, username, createdAt, expiresAt, key }",
        note: "The 'key' field in the response is the only time the plaintext key is returned. Store it securely!",
      },
      {
        method: "DELETE",
        path: "/api/admin/api-keys/:id",
        description: "Delete / revoke an API key (admin only)",
        auth: "admin session",
        response: "{ success: true }",
      },
    ],
  };

  return NextResponse.json(docs, {
    headers: { "Content-Type": "application/json" },
  });
}
