/**
 * Email-Service für Mission Control
 *
 * Sendet E-Mails via SMTP (nodemailer) mit graceful degradation.
 * Bei fehlender SMTP-Konfiguration wird eine Vorschau zurückgegeben.
 *
 * Benötigte ENV-Variablen (in Vercel Dashboard):
 * - SMTP_HOST:     SMTP-Server Hostname (z.B. smtp.mailgun.org)
 * - SMTP_PORT:     Port (587 für TLS, 465 für SSL) — Standard: 587
 * - SMTP_USER:     SMTP-Benutzername
 * - SMTP_PASS:     SMTP-Passwort (ohne dieses wird Preview-Modus aktiviert)
 * - SMTP_FROM:     Absender-Adresse (z.B. noreply@kochaufforstung.de)
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  method: "smtp" | "preview";
  messageId?: string;
  error?: string;
  html?: string;  // Nur bei method="preview"
  to?: string;
  subject?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  configured: boolean;
}

/**
 * Prüft ob SMTP konfiguriert ist und gibt die Konfiguration zurück.
 * Graceful Degradation: gibt { configured: false } zurück wenn SMTP_PASS fehlt.
 */
export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST || "";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@kochaufforstung.de";

  // Graceful degradation: alle Pflichtfelder müssen gesetzt sein
  const configured = Boolean(host && user && pass);

  return { host, port, user, pass, from, configured };
}

/**
 * Prüft ob SMTP vollständig konfiguriert ist.
 */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig().configured;
}

/**
 * Sendet eine E-Mail via SMTP oder gibt eine Vorschau zurück.
 *
 * Graceful Degradation:
 * - Wenn SMTP nicht konfiguriert → method: "preview", HTML wird zurückgegeben
 * - Wenn SMTP-Versand fehlschlägt → method: "preview" mit Fehlermeldung
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const config = getSmtpConfig();

  // Kein SMTP konfiguriert → Preview-Modus
  if (!config.configured) {
    console.warn("[Email] SMTP nicht konfiguriert. Preview-Modus aktiviert.");
    return {
      success: true,
      method: "preview",
      html: options.html,
      to: options.to,
      subject: options.subject,
    };
  }

  try {
    // Dynamischer Import von nodemailer (vermeidet Build-Fehler falls nicht installiert)
    const nodemailer = await import("nodemailer");
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // true für 465, false für 587 (STARTTLS)
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const fromAddress = options.from || `"Koch Aufforstung GmbH" <${config.from}>`;

    const result = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    console.log(`[Email] Erfolgreich gesendet an ${options.to}: ${result.messageId}`);

    return {
      success: true,
      method: "smtp",
      messageId: result.messageId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[Email] SMTP-Versand fehlgeschlagen:", errorMessage);

    // Graceful degradation: Bei Fehler Preview zurückgeben
    return {
      success: false,
      method: "preview",
      error: `SMTP-Versand fehlgeschlagen: ${errorMessage}`,
      html: options.html,
      to: options.to,
      subject: options.subject,
    };
  }
}

/**
 * Hilfsfunktion: Generiert E-Mail-Header für Logs (ohne sensible Daten)
 */
export function getEmailStatus(): {
  configured: boolean;
  host: string;
  port: number;
  from: string;
} {
  const config = getSmtpConfig();
  return {
    configured: config.configured,
    host: config.host || "(nicht gesetzt)",
    port: config.port,
    from: config.from,
  };
}
