import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cron-auth";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { de } from "date-fns/locale";
import ReactPDF, {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    marginRight: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  colProject: { width: "30%" },
  colOpen: { width: "15%", textAlign: "center" },
  colProgress: { width: "15%", textAlign: "center" },
  colDone: { width: "15%", textAlign: "center" },
  colHours: { width: "25%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
});

interface ProjectStats {
  id: string;
  name: string;
  color: string;
  tasksTodo: number;
  tasksInProgress: number;
  tasksDone: number;
  hoursLogged: number;
}

interface WeeklyReportData {
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalHoursLogged: number;
  projects: ProjectStats[];
  topCompletedTasks: { title: string; project: string }[];
}

// ─── PDF Document Component ────────────────────────────────────────────────────
function WeeklyReportPDF({ data }: { data: WeeklyReportData }) {
  const fmtDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: de });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wöchentlicher Statusbericht</Text>
          <Text style={styles.subtitle}>
            {fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)}
          </Text>
        </View>

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zusammenfassung</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.totalTasksCreated}</Text>
              <Text style={styles.statLabel}>Neue Aufgaben</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.totalTasksCompleted}</Text>
              <Text style={styles.statLabel}>Abgeschlossene Aufgaben</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {data.totalHoursLogged.toFixed(1)}h
              </Text>
              <Text style={styles.statLabel}>Erfasste Stunden</Text>
            </View>
          </View>
        </View>

        {/* Projects Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projektübersicht</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colProject}>Projekt</Text>
              <Text style={styles.colOpen}>Offen</Text>
              <Text style={styles.colProgress}>In Arbeit</Text>
              <Text style={styles.colDone}>Erledigt</Text>
              <Text style={styles.colHours}>Stunden</Text>
            </View>
            {data.projects.map((p) => (
              <View key={p.id} style={styles.tableRow}>
                <Text style={styles.colProject}>{p.name}</Text>
                <Text style={styles.colOpen}>{p.tasksTodo}</Text>
                <Text style={styles.colProgress}>{p.tasksInProgress}</Text>
                <Text style={styles.colDone}>{p.tasksDone}</Text>
                <Text style={styles.colHours}>{p.hoursLogged.toFixed(1)}h</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Completed Tasks */}
        {data.topCompletedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights der Woche</Text>
            {data.topCompletedTasks.map((t, i) => (
              <Text key={i} style={{ marginBottom: 4 }}>
                • {t.title} ({t.project})
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generiert am {format(data.generatedAt, "dd.MM.yyyy HH:mm", { locale: de })} 
            {" "}• Mission Control • Koch Aufforstung GmbH
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Data Fetching ─────────────────────────────────────────────────────────────
async function getWeeklyReportData(weekOffset = 0): Promise<WeeklyReportData> {
  const now = new Date();
  const targetWeek = weekOffset ? subWeeks(now, weekOffset) : now;
  const periodStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

  // Get all projects
  const projects = await prisma.project.findMany({
    where: { archived: false },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  // Tasks created this week
  const tasksCreated = await prisma.task.count({
    where: {
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  });

  // Tasks completed this week
  const tasksCompleted = await prisma.task.count({
    where: {
      status: "done",
      updatedAt: { gte: periodStart, lte: periodEnd },
    },
  });

  // Time entries this week
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      startTime: { gte: periodStart, lte: periodEnd },
    },
    select: {
      duration: true,
      task: {
        select: { projectId: true },
      },
    },
  });

  const totalHours = timeEntries.reduce(
    (sum, e) => sum + (e.duration || 0),
    0
  ) / 60;

  // Per-project stats
  const projectStats: ProjectStats[] = await Promise.all(
    projects.map(async (p) => {
      const [todo, inProgress, done] = await Promise.all([
        prisma.task.count({
          where: { projectId: p.id, status: { in: ["todo", "backlog"] } },
        }),
        prisma.task.count({
          where: { projectId: p.id, status: "in_progress" },
        }),
        prisma.task.count({
          where: {
            projectId: p.id,
            status: "done",
            updatedAt: { gte: periodStart, lte: periodEnd },
          },
        }),
      ]);

      const projectHours = timeEntries
        .filter((e) => e.task?.projectId === p.id)
        .reduce((sum, e) => sum + (e.duration || 0), 0) / 60;

      return {
        id: p.id,
        name: p.name,
        color: p.color,
        tasksTodo: todo,
        tasksInProgress: inProgress,
        tasksDone: done,
        hoursLogged: projectHours,
      };
    })
  );

  // Top completed tasks
  const completedTasks = await prisma.task.findMany({
    where: {
      status: "done",
      updatedAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      title: true,
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return {
    periodStart,
    periodEnd,
    generatedAt: now,
    totalTasksCreated: tasksCreated,
    totalTasksCompleted: tasksCompleted,
    totalHoursLogged: totalHours,
    projects: projectStats.filter(
      (p) => p.tasksTodo + p.tasksInProgress + p.tasksDone > 0 || p.hoursLogged > 0
    ),
    topCompletedTasks: completedTasks.map((t) => ({
      title: t.title,
      project: t.project?.name || "–",
    })),
  };
}

// ─── GET /api/reports/weekly ───────────────────────────────────────────────────
// Query params:
// - format: pdf (default) | json | email
// - email: address to send to (optional, required for format=email)
// - week: 0 (current, default), 1 (last week), etc.
// Also handles Vercel Cron calls (Authorization: Bearer CRON_SECRET)
export async function GET(req: NextRequest) {
  try {
    // Check for Vercel Cron authorization first
    const isCronCall = verifyCronAuth(req);
    
    if (isCronCall) {
      // Cron-triggered: send weekly report email
      const emailTo = process.env.REPORT_EMAIL;
      
      if (!emailTo) {
        return NextResponse.json({
          success: true,
          message: "Cron executed but REPORT_EMAIL not configured — no email sent",
          timestamp: new Date().toISOString(),
        });
      }
      
      const data = await getWeeklyReportData(1); // Last week for cron
      const fmtDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: de });
      const subject = `📊 Wöchentlicher Statusbericht (${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)})`;
      
      const html = generateEmailHtml(data);
      const result = await sendEmail({ to: emailTo, subject, html });
      
      return NextResponse.json({
        success: true,
        emailSent: result.success,
        method: result.method,
        to: emailTo,
        period: `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`,
        stats: {
          tasksCreated: data.totalTasksCreated,
          tasksCompleted: data.totalTasksCompleted,
          hoursLogged: data.totalHoursLogged.toFixed(1),
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Regular authenticated request
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const outputFormat = searchParams.get("format") ?? "pdf";
    const emailTo = searchParams.get("email");
    const weekOffset = parseInt(searchParams.get("week") ?? "0", 10);

    const data = await getWeeklyReportData(weekOffset);

    // JSON output
    if (outputFormat === "json") {
      return NextResponse.json(data);
    }

    // Generate PDF
    const pdfStream = await ReactPDF.renderToStream(
      <WeeklyReportPDF data={data} />
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Send via email if requested
    if (emailTo) {
      const fmtDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: de });
      const subject = `Wöchentlicher Statusbericht (${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)})`;
      const html = generateEmailHtml(data);
      await sendEmail({ to: emailTo, subject, html });
    }

    const filename = `statusbericht-${format(data.periodStart, "yyyy-MM-dd")}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/weekly]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// ─── POST /api/reports/weekly — manual trigger ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const emailTo = body.email || process.env.REPORT_EMAIL;

    if (!emailTo) {
      return NextResponse.json({
        success: false,
        error: "Email address required — provide 'email' in body or set REPORT_EMAIL env",
      }, { status: 400 });
    }

    const data = await getWeeklyReportData(body.week ?? 1);
    const fmtDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: de });
    const subject = `📊 Wöchentlicher Statusbericht (${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)})`;

    const html = generateEmailHtml(data);
    const result = await sendEmail({ to: emailTo, subject, html });

    return NextResponse.json({
      success: true,
      emailSent: result.success,
      method: result.method,
      to: emailTo,
      period: `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`,
    });
  } catch (err) {
    console.error("[POST /api/reports/weekly]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// ─── E-Mail HTML Generator ─────────────────────────────────────────────────────
function generateEmailHtml(data: WeeklyReportData): string {
  const fmtDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: de });
  const fmtDateTime = (d: Date) => format(d, "dd.MM.yyyy HH:mm", { locale: de });

  const projectRows = data.projects
    .map(
      (p) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px;">${p.name}</td>
          <td style="padding: 12px 8px; text-align: center;">${p.tasksTodo}</td>
          <td style="padding: 12px 8px; text-align: center;">${p.tasksInProgress}</td>
          <td style="padding: 12px 8px; text-align: center; color: #059669; font-weight: 600;">${p.tasksDone}</td>
          <td style="padding: 12px 8px; text-align: right;">${p.hoursLogged.toFixed(1)}h</td>
        </tr>
      `
    )
    .join("");

  const highlightsList = data.topCompletedTasks
    .map((t) => `<li style="margin-bottom: 6px;">✅ ${t.title} <span style="color: #6b7280;">(${t.project})</span></li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wöchentlicher Statusbericht</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 640px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px 40px;">
      <h1 style="margin: 0 0 8px; color: #fff; font-size: 24px; font-weight: 700;">📊 Wöchentlicher Statusbericht</h1>
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}</p>
    </div>

    <!-- KPI Cards -->
    <div style="padding: 24px 40px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: 700; color: #059669;">${data.totalTasksCreated}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Neue Aufgaben</div>
          </td>
          <td style="text-align: center; padding: 16px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <div style="font-size: 32px; font-weight: 700; color: #059669;">${data.totalTasksCompleted}</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Abgeschlossen</div>
          </td>
          <td style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: 700; color: #059669;">${data.totalHoursLogged.toFixed(1)}h</div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Stunden erfasst</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Content -->
    <div style="padding: 32px 40px;">
      <!-- Projects Table -->
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #111827; font-weight: 600;">Projektübersicht</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Projekt</th>
          <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Offen</th>
          <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">In Arbeit</th>
          <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Erledigt</th>
          <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151;">Stunden</th>
        </tr>
        ${projectRows}
      </table>

      ${
        data.topCompletedTasks.length > 0
          ? `
        <!-- Highlights -->
        <h2 style="margin: 32px 0 16px; font-size: 16px; color: #111827; font-weight: 600;">Highlights der Woche</h2>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.7;">
          ${highlightsList}
        </ul>
      `
          : ""
      }
    </div>

    <!-- Footer -->
    <div style="padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        Automatisch generiert am ${fmtDateTime(data.generatedAt)}<br>
        Mission Control • Koch Aufforstung GmbH
      </p>
    </div>
  </div>
</body>
</html>`;
}
