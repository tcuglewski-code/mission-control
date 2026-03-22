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

  // Memory
  MEMORY_VIEW:     'memory.view',
  MEMORY_WRITE:    'memory.write',

  // Kalender
  CALENDAR_VIEW:   'calendar.view',
  CALENDAR_WRITE:  'calendar.write',

  // Team
  TEAM_VIEW:       'team.view',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * Prüft ob ein User eine bestimmte Permission hat.
 * Admins haben immer alle Rechte.
 */
export function hasPermission(
  user: { role: string; permissions: string[] },
  permission: string
): boolean {
  if (user.role === 'admin') return true
  return user.permissions.includes(permission)
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
    label: '👥 Team',
    permissions: [
      { key: PERMISSIONS.TEAM_VIEW, label: 'Team ansehen' },
    ],
  },
]
