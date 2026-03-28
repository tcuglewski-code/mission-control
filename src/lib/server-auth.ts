import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export interface ServerSession {
  id: string
  username: string
  role: string
  mcRole: string
  active: boolean
  projectAccess: string[]
  permissions: string[]
}

/**
 * Loads Session + fresh DB data.
 * Redirects to /login if not logged in.
 */
export async function requireServerSession(): Promise<ServerSession> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.authUser.findUnique({ where: { id: session.user.id } })
  if (!user) redirect('/login')

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mcRole: (user as any).mcRole ?? 'entwickler',
    active: (user as any).active ?? true,
    projectAccess: user.projectAccess,
    permissions: user.permissions ?? [],
  }
}

/**
 * Returns allowed project IDs for a user.
 * null = no filter (admin sees all)
 * string[] = allowed project IDs (may be empty = nothing allowed)
 */
export function getAllowedProjectIds(session: ServerSession): string[] | null {
  if (session.role === 'admin') return null
  return session.projectAccess
}
