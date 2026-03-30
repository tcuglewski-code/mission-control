# Slack Integration

Mission Control kann Benachrichtigungen an Slack-Channels senden.

## Einrichtung

### 1. Slack Webhook erstellen

1. Öffne [api.slack.com/apps](https://api.slack.com/apps)
2. Erstelle eine neue App oder wähle eine bestehende
3. Gehe zu **Features** → **Incoming Webhooks**
4. Aktiviere Incoming Webhooks (falls nicht aktiv)
5. Klicke **Add New Webhook to Workspace**
6. Wähle den gewünschten Channel (z.B. `#mission-control`)
7. Kopiere die Webhook URL

### 2. In Mission Control konfigurieren

1. Gehe zu **Admin** → **Integrationen** (`/admin/integrations`)
2. Füge die Webhook URL ein
3. Wähle die gewünschten Events
4. Aktiviere die Integration
5. Klicke **Test senden** um die Verbindung zu prüfen

## Verfügbare Events

| Event | Beschreibung |
|-------|-------------|
| `task.created` | Neuer Task wurde erstellt |
| `task.completed` | Task wurde abgeschlossen |
| `task.updated` | Task wurde aktualisiert |
| `ticket.created` | Neues Support-Ticket eingegangen |
| `ticket.resolved` | Support-Ticket wurde gelöst |
| `comment.added` | Kommentar zu Task hinzugefügt |

## API Endpoints

### GET /api/integrations/slack

Holt die aktuelle Slack-Konfiguration.

**Response:**
```json
{
  "configured": true,
  "type": "slack",
  "name": "Slack Notifications",
  "webhookUrlSet": true,
  "events": ["task.completed", "ticket.created"],
  "enabled": true,
  "status": "active",
  "lastTestedAt": "2026-03-30T10:00:00.000Z"
}
```

### PUT /api/integrations/slack

Aktualisiert die Slack-Konfiguration.

**Request:**
```json
{
  "webhookUrl": "https://hooks.slack.com/services/T.../B.../...",
  "events": ["task.completed", "ticket.created"],
  "enabled": true
}
```

### POST /api/integrations/slack/test

Sendet eine Test-Nachricht an den konfigurierten Webhook.

**Response:**
```json
{
  "success": true,
  "message": "Test-Nachricht erfolgreich gesendet!",
  "status": 200,
  "duration": 245
}
```

## Nachrichtenformat

Mission Control verwendet das [Slack Block Kit](https://api.slack.com/block-kit) Format für reichhaltige Nachrichten:

- **Header Block**: Event-Typ mit Emoji
- **Section Block**: Task/Ticket-Titel als Link
- **Context Block**: Zusätzliche Infos (Projekt, Assignee, Priority)
- **Attachment**: Farbige Seitenleiste (grün=success, rot=deleted, etc.)

## Troubleshooting

### "Invalid Slack webhook URL"
- URL muss mit `https://hooks.slack.com/` beginnen
- Prüfe ob der Webhook noch aktiv ist

### "Test fehlgeschlagen" / Status 403
- Der Webhook wurde möglicherweise gelöscht
- Prüfe die Slack App Berechtigungen

### Status "error"
- Siehe `lastError` für Details
- Häufig: Webhook wurde von Slack deaktiviert (30 Tage ohne Nutzung)

## Sicherheit

- Webhook URLs werden nie im Klartext in der UI angezeigt (maskiert)
- Nur Admins können Integrationen konfigurieren
- Webhook URLs werden nur serverseitig gespeichert und verwendet
