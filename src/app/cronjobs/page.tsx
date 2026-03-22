import { prisma } from '@/lib/prisma';
import { CronJobsClient } from './CronJobsClient';
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function CronJobsPage() {
  const session = await requireServerSession();

  if (session.role !== 'admin') {
    return (
      <AppShell title="Cron Jobs" subtitle="Geplante Aufgaben">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Dieses Modul ist nur für Administratoren zugänglich.</p>
        </div>
      </AppShell>
    );
  }

  const jobs = await prisma.cronJob.findMany({ orderBy: { createdAt: 'asc' } });

  // Serialize dates for client component
  const serializedJobs = jobs.map((job) => ({
    ...job,
    lastRun: job.lastRun?.toISOString() ?? null,
    nextRun: job.nextRun?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }));

  return <CronJobsClient initialJobs={serializedJobs} />;
}
