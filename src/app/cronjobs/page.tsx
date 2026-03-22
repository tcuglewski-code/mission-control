import { prisma } from '@/lib/prisma';
import { CronJobsClient } from './CronJobsClient';
import { requireServerSession } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CronJobsPage() {
  const session = await requireServerSession();

  // CronJobs sind nur für Admins zugänglich
  if (session.role !== 'admin') {
    redirect('/dashboard');
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
