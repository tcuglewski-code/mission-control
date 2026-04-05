# Mission Control — DSGVO

> **Stand:** 2026-04-05
> **Hosting:** Vercel (EU-Region Frankfurt fra1 — ab KW15 2026)

---

## Verarbeitete Daten

| Kategorie | Daten | Zweck | Rechtsgrundlage |
|-----------|-------|-------|-----------------|
| Benutzer | Name, E-Mail, Rolle | Account-Verwaltung | Art. 6 Abs. 1 lit. b |
| Zeit | Zeiteinträge, Sessions | Leistungserfassung | Art. 6 Abs. 1 lit. b |
| Kommunikation | E-Mails (Inbox) | Task-Erstellung | Art. 6 Abs. 1 lit. f |
| Finanzen | Rechnungen, Angebote | Buchhaltung | Art. 6 Abs. 1 lit. b |
| Agent-Daten | AI Usage Logs | Kostentracking | Art. 6 Abs. 1 lit. f |

---

## Sicherheitsmaßnahmen

- **HTTPS:** TLS 1.3
- **Rate Limiting:** Upstash Redis (SC-02 — KW15)
- **Access Logging:** PdAccessLog für sensible Zugriffe (DA-29)
- **2FA:** TOTP für alle Benutzer verfügbar
- **EU-Region:** Frankfurt fra1 (DA-40 — KW15)
- **API Keys:** Gehashte Keys mit Scopes

---

## DSGVO-Compliance Monitor

- Automatischer wöchentlicher Check via `/api/cron/dsgvo-compliance` (Lexos-Agent, AF071)
- Findet nicht-konforme Datenhaltung, schlägt Korrekturen vor
- Report wird in Mission Control als Task erstellt

---

*Generiert: 2026-04-05*
