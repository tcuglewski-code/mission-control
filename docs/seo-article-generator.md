# Quill v2: SEO-Artikel Generator

## Übersicht

Automatisierter Cron-Job der monatlich SEO-optimierte Blog-Artikel generiert.

**Agent:** Quill v2  
**Cron:** Jeden 15. des Monats um 10:00 UTC (12:00 Berlin)  
**Route:** `POST /api/cron/seo-article-generator`

## Workflow

```
1. Perplexity Research
   └─> Aktuelle Branchen-Trends recherchieren
   └─> Artikel-Thema + Keywords extrahieren

2. Anthropic Haiku
   └─> SEO-optimierten Artikel generieren (700-900 Wörter)

3. MC-Dokument
   └─> Artikel als Draft in Documents speichern

4. Review-Task
   └─> Task für Tomek erstellen (7 Tage Deadline)

5. Telegram-Alert
   └─> Benachrichtigung über neuen Artikel
```

## Themen-Kategorien

| Kategorie | Beispiel-Keywords |
|-----------|-------------------|
| Forstwirtschaft | Fördermittel, Klimawandel Baumarten, Digitalisierung |
| Außendienst KMU | Field Service, Mobile Zeiterfassung, Offline-Apps |
| Landschaftsbau | GaLaBau Software, Grünflächenpflege |

Der Agent wählt pro Lauf zufällig eine Kategorie und Query aus.

## ENV-Variablen (erforderlich)

| Variable | Beschreibung |
|----------|--------------|
| `PERPLEXITY_API_KEY` | Perplexity API Key (sonar-pro) |
| `ANTHROPIC_API_KEY` | Anthropic API Key (claude-3-5-haiku) |
| `CRON_SECRET` | Vercel Cron Auth Token |

### Optional

| Variable | Beschreibung |
|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Für Benachrichtigungen |
| `TELEGRAM_CHAT_ID` | Ziel-Chat für Alerts |

## API Response

```json
{
  "success": true,
  "topic": {
    "title": "Klimawandelangepasste Baumarten 2026",
    "category": "Forstwirtschaft",
    "keywords": ["Klimawandel", "Baumarten", "Aufforstung"]
  },
  "document": {
    "id": "clxyz...",
    "title": "[DRAFT] Klimawandelangepasste Baumarten 2026"
  },
  "task": {
    "id": "clxyz...",
    "title": "✍️ SEO-Artikel Review: Klimawandelangepasste Baumarten 2026"
  },
  "articleLength": 847
}
```

## Artikel-Format

Generierte Artikel folgen dieser Struktur:

```markdown
# H1 Titel (mit Haupt-Keyword)

Einleitende 2-3 Sätze mit Keyword.

## H2 Abschnitt 1
Inhalt...

## H2 Abschnitt 2
Inhalt...

## Fazit
Zusammenfassung mit Keyword.

<!-- Meta-Description: Max 155 Zeichen für SEO -->
```

## Review-Workflow

1. **Dokument öffnen** — Artikel in MC-Docs lesen
2. **Fakten prüfen** — Quellen validieren, ggf. aktualisieren
3. **Anpassungen** — Stil, Formulierungen, CTAs ergänzen
4. **WP-Draft** — Artikel in WordPress übertragen
5. **Veröffentlichen** — Nach finalem Review publizieren

## ActivityLog

Jeder generierte Artikel wird geloggt:

| Action | EntityType | Details |
|--------|------------|---------|
| `SEO_ARTICLE_GENERATED` | document | category, keywords, sources, articleLength, taskId |

## Manueller Test

```bash
curl -X POST https://mission-control-tawny-omega.vercel.app/api/cron/seo-article-generator \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Fehlerbehebung

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Perplexity API not configured` | PERPLEXITY_API_KEY fehlt | In Vercel ENV setzen |
| `Anthropic API not configured` | ANTHROPIC_API_KEY fehlt | In Vercel ENV setzen |
| `Research failed` | Perplexity API-Fehler | Logs prüfen, Rate Limits |
| `Article generation failed` | Anthropic API-Fehler | API-Key prüfen |

## Kosten-Schätzung

| API | Modell | Schätzung pro Artikel |
|-----|--------|----------------------|
| Perplexity | sonar-pro | ~$0.05 |
| Anthropic | haiku | ~$0.01 |
| **Total** | | **~$0.06/Artikel** |

Bei monatlicher Ausführung: ~$0.72/Jahr

---

*Erstellt: 2026-04-01 | Sprint AF078*
