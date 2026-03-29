# Cron-Routes Sicherheit

## Übersicht

Mission Control nutzt Vercel Cron Jobs für automatisierte Aufgaben. Alle Cron-Routen sind durch einen gemeinsamen `CRON_SECRET` abgesichert.

## Vercel ENV Variable

```
CRON_SECRET=<mindestens 32 Zeichen zufälliger String>
```

**Generieren:**
```bash
openssl rand -base64 32
```

**Vercel Dashboard:** Settings → Environment Variables → Add `CRON_SECRET`

## Aktive Cron-Jobs (vercel.json)

| Route | Schedule | Beschreibung |
|-------|----------|-------------|
| `/api/digest/cron` | `0 6 * * *` | Täglich 06:00 UTC — AI Digest generieren |
| `/api/notifications/milestone-check` | `0 8 * * *` | Täglich 08:00 UTC — Meilenstein-Erinnerungen |
| `/api/invoices/overdue-check` | `0 7 * * *` | Täglich 07:00 UTC — Überfällige Rechnungen markieren |
| `/api/cron/overdue-check` | `0 7 * * *` | Täglich 07:00 UTC — (Legacy, identisch) |
| `/api/recurring/generate` | `0 0 * * *` | Täglich 00:00 UTC — Wiederkehrende Tasks erstellen |
| `/api/cron/send-reports` | `0 6 * * 1` | Montags 06:00 UTC — Wöchentliche Reports |

## Authentifizierung

Vercel sendet automatisch den Header:
```
Authorization: Bearer <CRON_SECRET>
```

Alle Cron-Routen nutzen die zentrale Auth-Funktion in `src/lib/cron-auth.ts`:

```typescript
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... Cron-Logik
}
```

## Sicherheitsregeln

1. **CRON_SECRET ist Pflicht in Production**
   - Ohne Secret werden alle Cron-Anfragen mit 401 abgelehnt
   - Kein Fallback auf "offen" bei fehlendem Secret

2. **Keine Development-Ausnahmen in Production**
   - `NODE_ENV !== "development"` Checks wurden entfernt
   - Stattdessen: explizites `ALLOW_DEV_CRON=true` für lokale Tests

3. **Legacy-Header-Support (temporär)**
   - `x-cron-secret` Header wird noch akzeptiert
   - Loggt Warnung — bitte auf `Authorization: Bearer` umstellen

4. **Konsistente Fehlerantwort**
   - Alle Routen geben `{ error: "Unauthorized — CRON_SECRET erforderlich" }` zurück

## Lokale Entwicklung

Für lokale Tests ohne Vercel Cron:

```bash
# .env.local
ALLOW_DEV_CRON=true
```

Dann kann ohne Auth aufgerufen werden:
```bash
curl http://localhost:3000/api/digest/cron
```

**⚠️ ACHTUNG:** `ALLOW_DEV_CRON=true` niemals in Vercel ENV setzen!

## Manueller Test (mit Secret)

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://mission-control-tawny-omega.vercel.app/api/digest/cron
```

## Fehlersuche

| Problem | Ursache | Lösung |
|---------|---------|--------|
| 401 Unauthorized | CRON_SECRET fehlt in Vercel | ENV Variable hinzufügen |
| Cron läuft nicht | Route nicht in vercel.json | Eintrag hinzufügen |
| Logs zeigen nichts | Vercel Cron Logs prüfen | Dashboard → Cron Jobs |

## Dateien

- `src/lib/cron-auth.ts` — Zentrale Auth-Funktion
- `vercel.json` — Cron-Schedule Definition
- `.env.example` — ENV-Dokumentation
