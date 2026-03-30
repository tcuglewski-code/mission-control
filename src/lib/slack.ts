/**
 * Slack Integration Library
 * Unterstützt Slack Block Kit Format für reichhaltige Nachrichten
 */

export interface SlackMessage {
  text: string; // Fallback für Notifications
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: "section" | "divider" | "header" | "context" | "actions";
  text?: {
    type: "mrkdwn" | "plain_text";
    text: string;
    emoji?: boolean;
  };
  accessory?: {
    type: "button";
    text: { type: "plain_text"; text: string; emoji?: boolean };
    url?: string;
    action_id?: string;
  };
  elements?: Array<{
    type: "mrkdwn" | "plain_text" | "image";
    text?: string;
    image_url?: string;
    alt_text?: string;
  }>;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export interface SlackSendResult {
  success: boolean;
  status?: number;
  error?: string;
  duration: number;
}

/**
 * Sendet eine Nachricht an einen Slack Webhook
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<SlackSendResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        error: errorText || `HTTP ${response.status}`,
        duration,
      };
    }

    return { success: true, status: response.status, duration };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - start,
    };
  }
}

/**
 * Erstellt eine formatierte Task-Nachricht
 */
export function formatTaskMessage(
  event: "created" | "completed" | "updated" | "deleted",
  task: {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    projectName?: string;
    assigneeName?: string;
  },
  baseUrl: string
): SlackMessage {
  const emoji = {
    created: "🆕",
    completed: "✅",
    updated: "📝",
    deleted: "🗑️",
  }[event];

  const color = {
    created: "#36a64f",
    completed: "#2ecc71",
    updated: "#3498db",
    deleted: "#e74c3c",
  }[event];

  const actionText = {
    created: "wurde erstellt",
    completed: "wurde abgeschlossen",
    updated: "wurde aktualisiert",
    deleted: "wurde gelöscht",
  }[event];

  const taskUrl = `${baseUrl}/tasks?highlight=${task.id}`;

  return {
    text: `${emoji} Task "${task.title}" ${actionText}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Task ${actionText}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${taskUrl}|${task.title}>*`,
        },
      },
      {
        type: "context",
        elements: [
          ...(task.projectName
            ? [{ type: "mrkdwn" as const, text: `📁 ${task.projectName}` }]
            : []),
          ...(task.assigneeName
            ? [{ type: "mrkdwn" as const, text: `👤 ${task.assigneeName}` }]
            : []),
          ...(task.priority
            ? [{ type: "mrkdwn" as const, text: `⚡ ${task.priority}` }]
            : []),
          ...(task.status
            ? [{ type: "mrkdwn" as const, text: `📊 ${task.status}` }]
            : []),
        ],
      },
    ],
    attachments: [{ color }],
  };
}

/**
 * Erstellt eine formatierte Ticket-Nachricht
 */
export function formatTicketMessage(
  event: "created" | "updated" | "resolved",
  ticket: {
    id: string;
    title: string;
    priority?: string;
    status?: string;
    requesterEmail?: string;
  },
  baseUrl: string
): SlackMessage {
  const emoji = {
    created: "🎫",
    updated: "📝",
    resolved: "✅",
  }[event];

  const color = {
    created: "#f39c12",
    updated: "#3498db",
    resolved: "#2ecc71",
  }[event];

  const actionText = {
    created: "Neues Support-Ticket",
    updated: "Ticket aktualisiert",
    resolved: "Ticket gelöst",
  }[event];

  const ticketUrl = `${baseUrl}/admin/tickets?highlight=${ticket.id}`;

  return {
    text: `${emoji} ${actionText}: ${ticket.title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${actionText}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${ticketUrl}|${ticket.title}>*`,
        },
      },
      {
        type: "context",
        elements: [
          ...(ticket.requesterEmail
            ? [{ type: "mrkdwn" as const, text: `📧 ${ticket.requesterEmail}` }]
            : []),
          ...(ticket.priority
            ? [{ type: "mrkdwn" as const, text: `🔥 ${ticket.priority}` }]
            : []),
          ...(ticket.status
            ? [{ type: "mrkdwn" as const, text: `📊 ${ticket.status}` }]
            : []),
        ],
      },
    ],
    attachments: [{ color }],
  };
}

/**
 * Erstellt eine Test-Nachricht
 */
export function formatTestMessage(baseUrl: string): SlackMessage {
  return {
    text: "🧪 Mission Control Test-Nachricht",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🧪 Slack Integration Test",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Die Verbindung zu Mission Control funktioniert! 🎉",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Quelle: <${baseUrl}|Mission Control>`,
          },
          {
            type: "mrkdwn",
            text: `Zeit: ${new Date().toLocaleString("de-DE")}`,
          },
        ],
      },
    ],
    attachments: [{ color: "#2C3A1C" }], // Waldgrün
  };
}

/**
 * Prüft ob eine Webhook-URL gültig aussieht
 */
export function isValidSlackWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "hooks.slack.com" ||
        parsed.hostname.endsWith(".slack.com"))
    );
  } catch {
    return false;
  }
}
