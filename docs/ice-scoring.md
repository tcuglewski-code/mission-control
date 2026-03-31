# ICE Scoring Framework (AF058)

## Übersicht

ICE (Impact, Confidence, Ease) ist ein Feature-Priorisierungs-Framework für datenbasierte Entscheidungen darüber, welche Features oder Tasks als nächstes bearbeitet werden sollten.

## Die drei Dimensionen

### 🎯 Impact (1-10)
*Wie viel Wert bringt das Feature für Nutzer oder Business?*

| Score | Bedeutung |
|-------|-----------|
| 1-2 | Minimal — kaum messbarer Effekt |
| 3-4 | Gering — kleiner Nutzen für wenige |
| 5-6 | Mittel — solider Nutzen für einige |
| 7-8 | Hoch — signifikanter Nutzen für viele |
| 9-10 | Enorm — Game-Changer |

### 🎯 Confidence (1-10)
*Wie sicher sind wir bei unserer Einschätzung?*

| Score | Bedeutung |
|-------|-----------|
| 1-2 | Reine Spekulation |
| 3-4 | Unsicher — basiert auf Annahmen |
| 5-6 | 50/50 — teils Daten, teils Annahmen |
| 7-8 | Ziemlich sicher — gute Datenlage |
| 9-10 | Fast sicher — klare Evidenz |

### ⚡ Ease (1-10)
*Wie einfach/schnell ist die Umsetzung?*

| Score | Bedeutung |
|-------|-----------|
| 1-2 | Extrem aufwändig — Wochen/Monate |
| 3-4 | Aufwändig — mehrere Tage |
| 5-6 | Mittel — ein paar Tage |
| 7-8 | Einfach — Stunden |
| 9-10 | Trivial — sofort machbar |

## Score-Berechnung

```
ICE Score = (Impact × Confidence × Ease) / 10
```

**Maximum:** 100 (10 × 10 × 10 / 10)
**Minimum:** 0.1 (1 × 1 × 1 / 10)

## Farbcodierung

| Score-Bereich | Farbe | Bedeutung |
|---------------|-------|-----------|
| 75-100 | 🟢 Grün | Top Priority — sofort machen! |
| 50-74 | 🔵 Blau | Quick Wins — gute Kandidaten |
| 25-49 | 🟡 Amber | Backlog — priorisieren bei Kapazität |
| 0-24 | ⚪ Grau | Niedrig — hinterfragen ob nötig |

## API-Endpunkte

### GET /api/tasks/ice-ranking
Gibt Tasks sortiert nach ICE-Score zurück.

**Query-Parameter:**
- `projectId` — Filtert nach Projekt
- `status` — Kommagetrennte Status-Liste (default: `todo,backlog,in_progress`)
- `limit` — Max. Anzahl Tasks (default: 50)
- `includeUnscored` — `true` zeigt auch unbewertete Tasks

**Response:**
```json
{
  "tasks": [...],
  "stats": {
    "totalTasks": 50,
    "scoredCount": 35,
    "unscoredCount": 15,
    "avgImpact": 6.2,
    "avgConfidence": 5.8,
    "avgEase": 7.1,
    "avgScore": 45.3,
    "distribution": {
      "low": 5,
      "medium": 15,
      "high": 10,
      "veryHigh": 5
    }
  }
}
```

### PATCH /api/tasks/[id]
Update ICE-Werte für einen Task.

**Body:**
```json
{
  "iceImpact": 8,
  "iceConfidence": 7,
  "iceEase": 6
}
```

Der `iceScore` wird automatisch berechnet.

### POST /api/tasks/ice-ranking
Bulk-Update für mehrere Tasks.

**Body:**
```json
{
  "updates": [
    { "taskId": "abc123", "iceImpact": 8, "iceConfidence": 7, "iceEase": 6 },
    { "taskId": "def456", "iceImpact": 5, "iceConfidence": 8, "iceEase": 9 }
  ]
}
```

## UI-Komponenten

### IceScoreBadge
Zeigt den ICE-Score als farbcodiertes Badge an.

```tsx
import { IceScoreBadge } from "@/components/tasks/IceScoreBadge";

<IceScoreBadge
  impact={8}
  confidence={7}
  ease={6}
  showDetails // Tooltip mit Breakdown
  size="md" // sm | md | lg
/>
```

### IceScoreEditor
Inline-Editor mit Slidern für ICE-Werte.

```tsx
import { IceScoreEditor } from "@/components/tasks/IceScoreEditor";

<IceScoreEditor
  taskId="abc123"
  initialImpact={8}
  initialConfidence={7}
  initialEase={6}
  onSave={async (values) => {
    await updateTask(taskId, values);
  }}
/>
```

## Prisma Schema

```prisma
model Task {
  // ... andere Felder
  iceImpact     Int?    // 1-10
  iceConfidence Int?    // 1-10
  iceEase       Int?    // 1-10
  iceScore      Float?  // Berechnet: (I × C × E) / 10
}
```

## Best Practices

1. **Regelmäßige Bewertung**: ICE-Scores bei Sprint-Planning oder Weekly Review vergeben
2. **Team-Konsens**: Bewertungen im Team diskutieren für bessere Confidence
3. **Daten nutzen**: Impact/Confidence mit echten Nutzerdaten untermauern
4. **Iteration**: Scores nach Umsetzung reflektieren (waren wir richtig?)
5. **Nicht übertreiben**: Nicht jeden Mini-Task bewerten — nur wichtige Features

## Referenzen

- [ICE Scoring bei GrowthHackers](https://growthhackers.com/articles/what-is-ice-score)
- [Sean Ellis on ICE](https://www.sean-ellis.com/)

---

*Implementiert: 31.03.2026 (AF058)*
