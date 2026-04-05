# Mission Control — Changelog

## KW 14–15 / 2026 (29.03.–05.04.2026)

### Neue Features

#### Reports & Monitoring (MC-04)
- **MC-04** Weekly Project Reporting Cron: `GET /api/reports/weekly` — PDF-Generierung + automatischer Versand
- `/api/projects/:id/report` — Projektbericht on-demand
- `/api/projects/:id/report-schedule` — Berichts-Zeitplan konfigurieren

#### DSGVO & Sicherheit (DA-29, DA-40, SC-02)
- **DA-29** Access-Logging für personenbezogene Daten (`PdAccessLog` Model)
- **DA-40** EU-Region Frankfurt (fra1) für Vercel Functions
- **SC-02** Upstash Rate Limiting: `@upstash/ratelimit` + `@upstash/redis`
- CI-Pipeline: Lint, TypeCheck, Build, Security Audit
- Security-Scan GitHub Action

#### Bug-Fixes / Stabilität (SB-01)
- Fehlende DB-Migration für Schema-Sync ergänzt
- 5 Build-Fehler behoben (fehlende Checkbox-Komponente etc.)
- Duplikat `Decision`-Model in Prisma-Schema entfernt
- SSR-Fehler auf Dashboard, Tasks, Projects, Time Pages gefixed
- Client-Side Crash behoben, TypeScript-Fehler
- `react-markdown` auf v9.1.0 (v10 bricht production build)
- Dependabot: Major-Version Auto-Merge blockiert

#### AI-Features
- Cron `/api/cron/seo-article-generator` — KI-generierte SEO-Artikel (Quill-v2)
- Upselling-Trigger `/api/cron/upsell-check` — vollständig aktiviert (AF068)
- DSGVO Compliance Monitor `/api/cron/dsgvo-compliance` — wöchentlicher Lexos-Agent Check (AF071)

#### Neue Module
- **AF083** Cleo-Agent: Kunden-Onboarding Tracker (`CustomerOnboarding` + Onboarding-Steps Model)
- **Q050** Decisions Log: Archiv wichtiger Entscheidungen (Prisma `Decision` Model)
- **Q037** Risk Register: 5x5 Risikomatrix (`Risk` Model)
- **Q032** Meeting-Notes Modul: `Meeting` + `MeetingActionItem` Models + API
- **AF088** Quartalsweise Roadmap-Review Prozess (`QUARTERLY` zu `RecurringInterval` Enum)
- **AF079** Referral Program Dokumentation
- **AF071** Lexos DSGVO Compliance Monitor
- **AF070** Monatlicher Finance-Review Cron
- **AF069** Cash Flow Dashboard: `Expense` Model + API + UI

#### Cron-Erweiterungen
- `/api/cron/seo-article-generator`
- `/api/cron/upsell-check`
- `/api/cron/dsgvo-compliance`
- `/api/cron/finance-review`

### Infrastruktur
- Railway Failover Konfiguration (`railway.toml`)
- Dependabot: wöchentliche Scans + Auto-Merge Patches
- Error Boundary: detaillierte Fehlermeldung für Diagnose
- Redeploy mit korrektem `NEXTAUTH_SECRET` Env Var

---

*Generiert: 2026-04-05 · Quelle: Git-Commits tcuglewski-code/mission-control*
