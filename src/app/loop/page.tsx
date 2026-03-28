import { prisma } from '@/lib/prisma';
import { LoopClient } from './LoopClient';
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function LoopPage() {
  const session = await requireServerSession();

  if (session.role !== 'admin') {
    return (
      <AppShell title="Auto-Loop" subtitle="Automatisierte Nacht-Tasks">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Dieses Modul ist nur für Administratoren zugänglich.</p>
        </div>
      </AppShell>
    );
  }

  // Tasks laden
  const tasks = await prisma.loopTask.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Settings laden
  let settings = await prisma.loopSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!settings) {
    settings = {
      id: 'singleton',
      enabled: false,
      scheduleExpr: '0,30 1-4 * * *',
      timezone: 'Europe/Berlin',
      maxTasksPerNight: 8,
      model: 'anthropic/claude-opus-4-5',
      updatedAt: new Date(),
    };
  }

  // Logs laden
  const logs = await prisma.loopLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Serialize für Client
  const serializedTasks = tasks.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    startedAt: t.startedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
  }));

  const serializedSettings = {
    ...settings,
    updatedAt: settings.updatedAt.toISOString(),
  };

  const serializedLogs = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <LoopClient
      initialTasks={serializedTasks}
      initialSettings={serializedSettings}
      initialLogs={serializedLogs}
    />
  );
}
