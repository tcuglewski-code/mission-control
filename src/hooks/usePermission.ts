'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, type Permission } from '@/lib/permissions'

interface UserData {
  id: string
  username: string
  role: string
  mcRole: string
  permissions: string[]
  active: boolean
}

let cachedUser: UserData | null = null
let fetchPromise: Promise<void> | null = null

function fetchUser(): Promise<void> {
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('/api/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (data) cachedUser = data })
    .catch(() => {})
    .finally(() => { fetchPromise = null })
  return fetchPromise
}

/**
 * Hook zum Prüfen von Berechtigungen.
 * 
 * @example
 * const canCreate = usePermission('projects.create')
 * return <button disabled={!canCreate}>Erstellen</button>
 */
export function usePermission(permission: Permission | string): boolean {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(cachedUser)

  useEffect(() => {
    if (!session?.user?.id) return
    if (cachedUser) { setUserData(cachedUser); return }
    fetchUser().then(() => { if (cachedUser) setUserData(cachedUser) })
  }, [session?.user?.id])

  if (!userData) return false
  if (!userData.active) return false

  return hasPermission(
    { role: userData.role, mcRole: userData.mcRole, permissions: userData.permissions },
    permission
  )
}

/**
 * Gibt mehrere Permissions auf einmal zurück.
 * 
 * @example
 * const { canCreate, canDelete } = usePermissions({
 *   canCreate: 'projects.create',
 *   canDelete: 'projects.delete',
 * })
 */
export function usePermissions<T extends Record<string, Permission | string>>(
  permMap: T
): Record<keyof T, boolean> {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(cachedUser)

  useEffect(() => {
    if (!session?.user?.id) return
    if (cachedUser) { setUserData(cachedUser); return }
    fetchUser().then(() => { if (cachedUser) setUserData(cachedUser) })
  }, [session?.user?.id])

  const result = {} as Record<keyof T, boolean>
  for (const key in permMap) {
    if (!userData || !userData.active) {
      result[key] = false
    } else {
      result[key] = hasPermission(
        { role: userData.role, mcRole: userData.mcRole, permissions: userData.permissions },
        permMap[key]
      )
    }
  }
  return result
}

/**
 * Gibt die Rolle des aktuellen Benutzers zurück.
 */
export function useCurrentUser(): UserData | null {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(cachedUser)

  useEffect(() => {
    if (!session?.user?.id) return
    if (cachedUser) { setUserData(cachedUser); return }
    fetchUser().then(() => { if (cachedUser) setUserData(cachedUser) })
  }, [session?.user?.id])

  return userData
}
