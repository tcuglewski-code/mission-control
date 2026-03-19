import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { TicketsClient } from "./TicketsClient";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const [ticketsRaw, projects, users] = await Promise.all([
    prisma.ticket.findMany({
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Serialize Dates to strings for client component
  const tickets = JSON.parse(JSON.stringify(ticketsRaw));

  return (
    <AppShell title="Tickets" subtitle="Support & Issues">
      <div className="p-6">
        <TicketsClient
          initialTickets={tickets}
          projects={projects}
          users={users}
        />
      </div>
    </AppShell>
  );
}
