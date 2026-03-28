import { prisma } from "@/lib/prisma";

const MAX_ERROR_LOGS = 50;

export async function logApiError(params: {
  path: string;
  method?: string;
  statusCode?: number;
  message: string;
  stack?: string;
  userId?: string;
}) {
  try {
    await prisma.errorLog.create({
      data: {
        path: params.path,
        method: params.method ?? "GET",
        statusCode: params.statusCode ?? 500,
        message: params.message.slice(0, 1000),
        stack: params.stack ? params.stack.slice(0, 3000) : null,
        userId: params.userId ?? null,
      },
    });

    // Alte Einträge bereinigen — nur letzte 50 behalten
    const count = await prisma.errorLog.count();
    if (count > MAX_ERROR_LOGS) {
      const oldest = await prisma.errorLog.findMany({
        orderBy: { createdAt: "asc" },
        take: count - MAX_ERROR_LOGS,
        select: { id: true },
      });
      await prisma.errorLog.deleteMany({
        where: { id: { in: oldest.map((e) => e.id) } },
      });
    }
  } catch {
    // Fehler beim Fehler-Logging → still ignorieren
  }
}
