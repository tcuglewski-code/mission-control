export const PERMISSIONS = {
  // Projekte
  PROJECTS_VIEW:   'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT:   'projects.edit',
  PROJECTS_DELETE: 'projects.delete',

  // Tasks
  TASKS_VIEW:      'tasks.view',
  TASKS_CREATE:    'tasks.create',
  TASKS_EDIT:      'tasks.edit',
  TASKS_DELETE:    'tasks.delete',
  TASKS_OWN:       'tasks.own',    // eigene Tasks bearbeiten

  // Kommentare
  COMMENTS_CREATE: 'comments.create',
  COMMENTS_EDIT:   'comments.edit',

  // Zeiterfassung
  TIME_VIEW:       'time.view',
  TIME_TRACK:      'time.track',

  // Berichte
  REPORTS_VIEW:    'reports.view',

  // Memory
  MEMORY_VIEW:     'memory.view',
  MEMORY_WRITE:    'memory.write',

  // Kalender
  CALENDAR_VIEW:   'calendar.view',
  CALENDAR_WRITE:  'calendar.write',

  // Team
  TEAM_VIEW:       'team.view',

  // Benutzer
  USERS_VIEW:      'users.view',
  USERS_MANAGE:    'users.manage',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ─── Rollen ───────────────────────────────────────────────────────────────────
export type McRole = 'admin' | 'projektmanager' | 'entwickler' | 'beobachter'

export const MC_ROLES: { value: McRole; label: string; color: string; bg: string }[] = [
  { value: 'admin',          label: 'Admin',          color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  { value: 'projektmanager', label: 'Projektmanager', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  { value: 'entwickler',     label: 'Entwickler',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { value: 'beobachter',     label: 'Beobachter',     color: 'text-zinc-400',    bg: 'bg-zinc-500/10 border-zinc-500/20' },
]

export const ROLE_PERMISSIONS: Record<McRole, Permission[]> = {
  admin: Object.values(PERMISSIONS) as Permission[],
  projektmanager: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_EDIT,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_EDIT,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.COMMENTS_CREATE,
    PERMISSIONS.COMMENTS_EDIT,
    PERMISSIONS.TIME_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_WRITE,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.USERS_VIEW,
  ],
  entwickler: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_OWN,
    PERMISSIONS.COMMENTS_CREATE,
    PERMISSIONS.COMMENTS_EDIT,
    PERMISSIONS.TIME_VIEW,
    PERMISSIONS.TIME_TRACK,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.TEAM_VIEW,
  ],
  beobachter: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
}

/**
 * Prüft ob ein User eine bestimmte Permission hat.
 * Admins (role=admin oder mcRole=admin) haben immer alle Rechte.
 */
export function hasPermission(
  user: { role: string; mcRole?: string; permissions: string[] },
  permission: string
): boolean {
  if (user.role === 'admin' || user.mcRole === 'admin') return true
  // Check granular permissions
  if (user.permissions.includes(permission)) return true
  // Check role-based permissions
  const mcRole = (user.mcRole ?? 'entwickler') as McRole
  const rolePerms = ROLE_PERMISSIONS[mcRole] ?? []
  return rolePerms.includes(permission as Permission)
}

/**
 * Grouped permissions for the Admin UI.
 */
export const PERMISSION_GROUPS = [
  {
    label: '📁 Projekte',
    permissions: [
      { key: PERMISSIONS.PROJECTS_VIEW,   label: 'Projekte ansehen' },
      { key: PERMISSIONS.PROJECTS_CREATE, label: 'Projekte erstellen' },
      { key: PERMISSIONS.PROJECTS_EDIT,   label: 'Projekte bearbeiten' },
      { key: PERMISSIONS.PROJECTS_DELETE, label: 'Projekte löschen' },
    ],
  },
  {
    label: '✅ Tasks',
    permissions: [
      { key: PERMISSIONS.TASKS_VIEW,   label: 'Tasks ansehen' },
      { key: PERMISSIONS.TASKS_CREATE, label: 'Tasks erstellen' },
      { key: PERMISSIONS.TASKS_EDIT,   label: 'Tasks bearbeiten' },
      { key: PERMISSIONS.TASKS_DELETE, label: 'Tasks löschen' },
      { key: PERMISSIONS.TASKS_OWN,    label: 'Eigene Tasks bearbeiten' },
    ],
  },
  {
    label: '💬 Kommentare',
    permissions: [
      { key: PERMISSIONS.COMMENTS_CREATE, label: 'Kommentare schreiben' },
      { key: PERMISSIONS.COMMENTS_EDIT,   label: 'Kommentare bearbeiten' },
    ],
  },
  {
    label: '⏱️ Zeiterfassung',
    permissions: [
      { key: PERMISSIONS.TIME_VIEW,  label: 'Zeiterfassung ansehen' },
      { key: PERMISSIONS.TIME_TRACK, label: 'Zeit erfassen' },
    ],
  },
  {
    label: '📊 Berichte',
    permissions: [
      { key: PERMISSIONS.REPORTS_VIEW, label: 'Berichte ansehen' },
    ],
  },
  {
    label: '🧠 Memory',
    permissions: [
      { key: PERMISSIONS.MEMORY_VIEW,  label: 'Memory lesen' },
      { key: PERMISSIONS.MEMORY_WRITE, label: 'Memory schreiben' },
    ],
  },
  {
    label: '📅 Kalender',
    permissions: [
      { key: PERMISSIONS.CALENDAR_VIEW,  label: 'Kalender ansehen' },
      { key: PERMISSIONS.CALENDAR_WRITE, label: 'Kalender bearbeiten' },
    ],
  },
  {
    label: '👥 Team & Benutzer',
    permissions: [
      { key: PERMISSIONS.TEAM_VIEW,    label: 'Team ansehen' },
      { key: PERMISSIONS.USERS_VIEW,   label: 'Benutzer ansehen' },
      { key: PERMISSIONS.USERS_MANAGE, label: 'Benutzer verwalten' },
    ],
  },
]
