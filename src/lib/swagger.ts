/**
 * Mission Control OpenAPI 3.0 Specification
 * Manual spec covering the ~20 most important API routes.
 * Rendered as JSON at /api/openapi
 * Human-readable page at /api-docs
 */

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Mission Control API",
    version: "1.0.0",
    description:
      "Feldhub Mission Control REST API — Projekt-Management, Tasks, Milestones, Team, Invoices, Webhooks und mehr.",
    contact: {
      name: "Feldhub / OpenClaw",
      url: "https://mission-control-tawny-omega.vercel.app",
    },
  },
  servers: [
    {
      url: "https://mission-control-tawny-omega.vercel.app",
      description: "Production",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "NextAuth session cookie (browser login)",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key via Bearer token (mc_live_...)",
      },
    },
    schemas: {
      Task: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["backlog", "todo", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          labels: { type: "string" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          projectId: { type: "string", nullable: true },
          assigneeId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["active", "planning", "completed", "archived"] },
          color: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Milestone: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          dueDate: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["open", "closed"] },
          projectId: { type: "string" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          invoiceNumber: { type: "string" },
          clientId: { type: "string" },
          amount: { type: "number" },
          status: { type: "string", enum: ["draft", "sent", "paid", "overdue", "cancelled"] },
          dueDate: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  tags: [
    { name: "Tasks", description: "Task CRUD & management" },
    { name: "Projects", description: "Project management" },
    { name: "Milestones", description: "Milestone tracking" },
    { name: "Team", description: "Team members & resources" },
    { name: "Invoices", description: "Invoicing & payments" },
    { name: "Activity", description: "Activity feed & logging" },
    { name: "Webhooks", description: "Webhook management" },
    { name: "Auth", description: "Authentication & 2FA" },
    { name: "Admin", description: "Admin-only endpoints" },
    { name: "Memory", description: "Knowledge base / journal" },
  ],
  paths: {
    // === Tasks ===
    "/api/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks",
        description: "Returns tasks filtered by project access for non-admin users.",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" }, required: false },
          { name: "projectId", in: "query", schema: { type: "string" }, required: false },
          { name: "assigneeId", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: {
          "200": {
            description: "Array of task objects",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Task" } },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a new task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", default: "backlog" },
                  priority: { type: "string", default: "medium" },
                  labels: { type: "string" },
                  dueDate: { type: "string", format: "date-time" },
                  projectId: { type: "string" },
                  assigneeId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Task created" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get a single task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Task object with relations" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update a task (partial)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Task" },
            },
          },
        },
        responses: {
          "200": { description: "Task updated" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Task deleted" },
          "404": { description: "Not found" },
        },
      },
    },

    // === Projects ===
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List all projects",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: {
          "200": {
            description: "Array of project objects",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Project" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        responses: { "201": { description: "Project created" } },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get a single project",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Project object" } },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Project updated" } },
      },
    },

    // === Milestones ===
    "/api/milestones": {
      get: {
        tags: ["Milestones"],
        summary: "List milestones",
        responses: {
          "200": {
            description: "Array of milestones",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Milestone" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Milestones"],
        summary: "Create a milestone",
        responses: { "201": { description: "Milestone created" } },
      },
    },
    "/api/milestones/{id}": {
      get: {
        tags: ["Milestones"],
        summary: "Get a single milestone",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Milestone object" } },
      },
      patch: {
        tags: ["Milestones"],
        summary: "Update a milestone",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Milestone updated" } },
      },
    },

    // === Team ===
    "/api/team": {
      get: {
        tags: ["Team"],
        summary: "Get team overview",
        responses: { "200": { description: "Team data with members" } },
      },
    },
    "/api/team/members": {
      get: {
        tags: ["Team"],
        summary: "List team members",
        responses: { "200": { description: "Array of team members" } },
      },
    },
    "/api/team/sp-capacity": {
      get: {
        tags: ["Team"],
        summary: "Get story point capacity",
        responses: { "200": { description: "SP capacity data" } },
      },
    },

    // === Invoices ===
    "/api/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List invoices",
        responses: {
          "200": {
            description: "Array of invoices",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Invoice" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create an invoice",
        responses: { "201": { description: "Invoice created" } },
      },
    },
    "/api/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Get a single invoice",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Invoice object" } },
      },
      patch: {
        tags: ["Invoices"],
        summary: "Update an invoice",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Invoice updated" } },
      },
    },

    // === Activity ===
    "/api/activity": {
      get: {
        tags: ["Activity"],
        summary: "Get activity feed",
        responses: { "200": { description: "Array of activity log entries" } },
      },
      post: {
        tags: ["Activity"],
        summary: "Log an activity",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action", "entityType", "entityId", "entityName"],
                properties: {
                  action: { type: "string" },
                  entityType: { type: "string" },
                  entityId: { type: "string" },
                  entityName: { type: "string" },
                  projectId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Activity logged" } },
      },
    },

    // === Webhooks ===
    "/api/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "List configured webhooks",
        responses: { "200": { description: "Array of webhook configs" } },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Create a webhook",
        responses: { "201": { description: "Webhook created" } },
      },
    },
    "/api/webhooks/{id}": {
      patch: {
        tags: ["Webhooks"],
        summary: "Update a webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Webhook updated" } },
      },
      delete: {
        tags: ["Webhooks"],
        summary: "Delete a webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Webhook deleted" } },
      },
    },
    "/api/webhook-logs": {
      get: {
        tags: ["Webhooks"],
        summary: "List webhook delivery logs",
        responses: { "200": { description: "Array of webhook log entries" } },
      },
    },

    // === Memory ===
    "/api/memory": {
      get: {
        tags: ["Memory"],
        summary: "List memory entries",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, required: false },
          { name: "type", in: "query", schema: { type: "string", enum: ["journal", "longterm"] }, required: false },
          { name: "search", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: { "200": { description: "Array of memory entries" } },
      },
      post: {
        tags: ["Memory"],
        summary: "Create a memory entry",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  category: { type: "string", default: "general" },
                  type: { type: "string", default: "journal" },
                  tags: { type: "string" },
                  source: { type: "string" },
                  projectId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Memory entry created" } },
      },
    },

    // === Auth ===
    "/api/auth/[...nextauth]": {
      get: {
        tags: ["Auth"],
        summary: "NextAuth handler (GET)",
        description: "NextAuth.js catch-all for session, signin, signout, csrf, providers.",
        responses: { "200": { description: "NextAuth response" } },
      },
      post: {
        tags: ["Auth"],
        summary: "NextAuth handler (POST)",
        responses: { "200": { description: "NextAuth response" } },
      },
    },

    // === Admin ===
    "/api/admin/api-keys": {
      get: {
        tags: ["Admin"],
        summary: "List all API keys (admin only)",
        responses: { "200": { description: "Array of API key objects" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create an API key (admin only)",
        description: "Returns plaintext key ONCE at creation time.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "userId"],
                properties: {
                  name: { type: "string" },
                  userId: { type: "string" },
                  expiresAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "API key created (plaintext key in response)" } },
      },
    },
    "/api/admin/api-keys/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Revoke an API key (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "API key revoked" } },
      },
    },
  },
} as const;
