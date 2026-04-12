# Mission Control — Authentifizierung & Sicherheit

## Auth-Architektur

Mission Control nutzt **NextAuth v5** mit Credentials-Provider:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│   NextAuth   │────▶│   Prisma    │
│  (Session)  │     │   JWT/CSRF   │     │  AuthUser   │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  middleware │  ← Rate-Limiting + Auth-Check
└─────────────┘
```

## User-Modell (AuthUser)

```prisma
model AuthUser {
  id             String    @id @default(cuid())
  username       String    @unique
  email          String?
  passwordHash   String
  role           String    @default("viewer")
  projectAccess  String?   // JSON: ["projectId1", "projectId2"] oder "all"
  permissions    String[]  // Granulare Berechtigungen
  onboardingComplete Boolean @default(false)
  tourComplete   Boolean   @default(false)
  totpSecret     String?   // 2FA TOTP Secret
  totpEnabled    Boolean   @default(false)
}
```

## Rollen & Berechtigungen

| Rolle | Beschreibung |
|-------|-------------|
| `admin` | Vollzugriff, User-Management |
| `human` | Standard-User, Projektarbeit |
| `viewer` | Nur Leserechte |
| `agent` | AI-Agent, API-Zugriff |

### projectAccess

- `"all"` — Zugriff auf alle Projekte
- `["id1", "id2"]` — Nur spezifische Projekte

### permissions (Array)

- `tasks:write`
- `projects:manage`
- `invoices:create`
- `admin:users`
- etc.

## Login-Flow

1. User gibt Username + Passwort ein
2. `auth.ts` → `authorize()` prüft via Prisma
3. Passwort-Vergleich mit bcrypt
4. JWT-Token wird erstellt (Session-Cookie)
5. Middleware prüft bei jedem Request

### Login-Endpoint

```
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

username=admin&password=xxx&csrfToken=xxx
```

## API-Key-Authentifizierung

Für externe Clients (Agents, Scripts):

```bash
curl -H "Authorization: Bearer mc_live_25bd2bb6..." \
     https://mission-control-tawny-omega.vercel.app/api/tasks
```

- Keys beginnen mit `mc_live_`
- Middleware erlaubt Zugriff ohne Session
- Rate-Limit: 200/min pro Key

## Zwei-Faktor-Authentifizierung (2FA)

Mission Control unterstützt TOTP-basierte 2FA:

1. User aktiviert 2FA in Settings
2. QR-Code wird generiert (via `qrcode` + `otpauth`)
3. Secret wird verschlüsselt in `totpSecret` gespeichert
4. Bei Login: zusätzlicher TOTP-Code erforderlich

## Rate-Limiting

Implementiert in `middleware.ts`:

| Scope | Limit | Zeitfenster |
|-------|-------|-------------|
| Login (IP) | 10 Versuche | 15 Minuten |
| API (IP) | 100 Requests | 1 Minute |
| API-Key | 200 Requests | 1 Minute |

Bei Überschreitung:
```
HTTP 429 Too Many Requests
Retry-After: 60
```

## Öffentliche Pfade (keine Auth)

- `/login` — Login-Seite
- `/invite/:token` — Einladungslink
- `/share/:id` — Öffentliche Shares
- `/api/auth/*` — NextAuth Endpoints
- `/api/webhooks/*` — Webhook-Empfang
- `/api/cron/*` — Cron-Jobs (Vercel)
- `/api/agents/heartbeat` — Agent-Heartbeat

## Onboarding-Flow

Neue User werden nach erstem Login zu `/onboarding` weitergeleitet:

1. Profil vervollständigen
2. Tour durch die App
3. `onboardingComplete: true` setzen

## Sicherheits-Maßnahmen

### Passwort-Hashing
- bcrypt mit automatischem Salt
- Keine Plaintext-Speicherung

### CSRF-Schutz
- NextAuth CSRF-Token in Forms
- SameSite Cookie-Policy

### Secure Headers (via Vercel)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=...`

### Input-Validierung
- Prisma mit TypeScript-Typen
- Keine SQL-Injection möglich

### Audit-Logging
- Alle Aktionen in ActivityLog
- Wer hat wann was geändert

## Einladungs-System

Admins können neue User einladen:

1. `/admin/users` → "Einladen"
2. E-Mail mit Einladungslink (via Resend)
3. User setzt Passwort unter `/invite/:token`
4. Account wird aktiviert

## Best Practices

1. **Starke Passwörter** — Min. 12 Zeichen empfohlen
2. **2FA aktivieren** — Besonders für Admins
3. **API-Keys rotieren** — Regelmäßig neue Keys generieren
4. **Projekt-Access prüfen** — Least Privilege Prinzip
5. **Activity-Log monitoren** — Ungewöhnliche Aktivitäten erkennen

---

*Erstellt: 2026-04-04 | Autor: Amadeus (Auto-Loop B)*
