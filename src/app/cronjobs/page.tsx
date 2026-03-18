import { prisma } from '@/lib/prisma';
import { CronJobsClient } from './CronJobsClient';

export const dynamic = 'force-dynamic';

export default async function CronJobsPage() {
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
