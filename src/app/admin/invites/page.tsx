import { requireAdminFromDb } from "@/lib/api-auth";
import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { AdminInvitesClient } from "./AdminInvitesClient";
import { prisma } from "@/lib/prisma";

export default async function AdminInvitesPage() {
  await requireServerSession();
  const admin = await requireAdminFromDb();

  if (!admin) {
    return (
      <AppShell title="Einladungen" subtitle="Admin">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Nur Admins können Einladungen verwalten.</p>
        </div>
      </AppShell>
    );
  }

  const invites = await prisma.userInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return (
    <AppShell title="Einladungen" subtitle="Neue Benutzer einladen">
      <div className="p-6">
        <AdminInvitesClient
          initialInvites={invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
            expiresAt: i.expiresAt.toISOString(),
            used: i.used,
            createdAt: i.createdAt.toISOString(),
            link: `${baseUrl}/invite/${i.token}`,
          }))}
        />
      </div>
    </AppShell>
  );
}
