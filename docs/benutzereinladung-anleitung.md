# Mission Control — Benutzereinladung

> Anleitung für Administratoren zum Einladen neuer Benutzer

---

## 📍 Voraussetzungen

- Du musst als **Admin** eingeloggt sein (Rolle: `admin`)
- URL: https://mission-control-tawny-omega.vercel.app

---

## 🚀 Schritt-für-Schritt: Neuen Benutzer einladen

### 1. Admin-Bereich öffnen

Navigiere zu:
```
/admin/users
```

Oder: Sidebar → **Benutzerverwaltung** (nur für Admins sichtbar)

---

### 2. Einladungslink erstellen

1. Klicke auf den grünen Button **„Einladung erstellen"** (oben rechts)
2. Modal öffnet sich

**Optionales Feld: E-Mail**
- Wenn du die E-Mail des neuen Users eingibst, wird sie intern zur Einladung gespeichert
- Der Link funktioniert auch ohne E-Mail (offener Link)
- Empfehlung: E-Mail eingeben für bessere Nachverfolgbarkeit

3. Klicke auf **„Link generieren"**

---

### 3. Einladungslink versenden

Nach Generierung erscheint der Link im Modal:

```
https://mission-control-tawny-omega.vercel.app/invite/[64-stelliger-token]
```

**Wichtig:**
- ⏰ Link ist **7 Tage gültig**
- 🔒 Jeder Link kann nur **einmal** verwendet werden
- 📋 Nutze den **„Kopieren"**-Button und sende den Link z.B. per E-Mail oder Messenger

---

### 4. Was passiert beim Eingeladenen?

Der neue Benutzer:

1. Öffnet den Einladungslink
2. Sieht das Registrierungsformular:
   - **Benutzername** (frei wählbar, z.B. `maria.koch`)
   - **Passwort** (min. 8 Zeichen)
   - **Passwort bestätigen**
3. Klickt auf „Registrieren"
4. Wird zu `/login?registered=1` weitergeleitet
5. Kann sich ab sofort einloggen

---

## 👤 Benutzer nach Registrierung konfigurieren

Nach der Registrierung hat der neue User:
- Rolle: `user` (Standard)
- Projektzugang: **keiner** (muss zugewiesen werden!)
- Berechtigungen: **keine** (muss konfiguriert werden!)

### Berechtigungen zuweisen:

1. Gehe zu `/admin/users`
2. Finde den neuen User in der Liste
3. Klicke **„Bearbeiten"**
4. Konfiguriere:
   - **Rolle:** `user` oder `admin`
   - **Projektzugang:** Welche Projekte darf der User sehen?
   - **Berechtigungen:** Welche Aktionen darf der User ausführen?
5. Klicke **„Speichern"**

---

## 🔑 API-Keys erstellen (für Agenten/Automatisierung)

Im Tab **„API-Keys"** kannst du programmatische Zugänge erstellen:

1. Klicke **„Neuen API-Key erstellen"**
2. Fülle aus:
   - **Name:** z.B. „Claude Agent" oder „Zapier Integration"
   - **User:** Wähle den User, dessen Berechtigungen der Key erbt
   - **Ablaufdatum:** Optional (empfohlen für Sicherheit)
3. Klicke **„API-Key generieren"**

**⚠️ WICHTIG:** Der Key wird nur einmal angezeigt! Sofort kopieren und sicher aufbewahren.

**Verwendung:**
```
Authorization: Bearer mc_live_...
```

---

## 📋 Berechtigungsgruppen

| Gruppe | Berechtigungen |
|--------|---------------|
| **Projekte** | Projekte ansehen, bearbeiten, erstellen, löschen |
| **Tasks** | Tasks ansehen, bearbeiten, erstellen, löschen, zuweisen |
| **Team** | Teammitglieder ansehen, einladen, bearbeiten |
| **Berichte** | Reports ansehen, exportieren |
| **Admin** | Benutzerverwaltung, System-Einstellungen |

---

## ❓ FAQ

**Q: Kann ich einen Einladungslink mehrfach verwenden?**
A: Nein, jeder Link funktioniert nur einmal.

**Q: Was passiert wenn der Link abläuft?**
A: Der User sieht eine Fehlermeldung. Erstelle einfach einen neuen Link.

**Q: Kann ich die E-Mail nachträglich ändern?**
A: Die Einladungs-E-Mail dient nur zur Dokumentation. Der User registriert sich mit eigenem Benutzernamen.

**Q: Wie lösche ich einen User?**
A: In der Benutzerliste → Papierkorb-Icon rechts neben dem User.

---

## 🔒 Sicherheitshinweise

1. **Einladungslinks sind sensibel** — nur an vertrauenswürdige Personen senden
2. **Admin-Rolle sparsam vergeben** — Admins haben Vollzugriff
3. **API-Keys mit Ablaufdatum** — für externe Integrationen empfohlen
4. **Projektzugang einschränken** — User nur die nötigen Projekte sehen lassen

---

*Dokumentation erstellt: 05.04.2026 | Version 1.0*
