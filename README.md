# 🧠 LearnMap

> **Eine moderne, interaktive Lern- und Wissensmanagement-Plattform.**  
> Mindmaps, Karteikarten mit Spaced Repetition, Notizen, Taskcards, Zeitleisten und Prüfungssimulationen – alles in einer flüssigen, reaktiven Oberfläche.

---

## 🔒 100% Datenschutz & Local-First Architektur

Obwohl diese Website öffentlich über **GitHub Pages** bereitgestellt werden kann, bleiben die Daten der Benutzer **zu 100% lokal und privat auf deren eigenem Rechner**:

- **Keine Cloud-Datenbank & kein Server-Speicher:** Alle erstellten Projekte, Mindmaps, Karteikarten, Notizen und Anhänge werden ausschließlich in der lokalen Browser-Sandbox des Nutzers gespeichert (`LocalStorage` für Texte und Strukturen, `IndexedDB` für Bilder und Dateianhänge).
- **Vollständige Datentrennung:** Jeder Besucher, der deine GitHub-Pages-URL öffnet, arbeitet in seiner eigenen, isolierten lokalen Datenbank. Niemand sieht die Daten eines anderen Nutzers.
- **Kein Tracking, keine Cookies:** Weder GitHub noch Dritte erhalten Einblick in deine Lerninhalte.
- **Offline-Fähig:** Einmal im Browser geladen, funktioniert LearnMap auch komplett ohne Internetverbindung.
- **Sichere Backups:** Über das Einstellungsmenü (`Einstellungen` ➔ `Daten & Speicher`) kann der gesamte Datenbestand jederzeit mit einem Klick als JSON-Datei exportiert und auf jedem beliebigen Rechner wieder importiert werden.

---

## ✨ Features im Überblick

- 🗺️ **Interaktive Mindmaps:** Visuelle Wissensnetze mit hierarchischem Auto-Layout (Dagre & Radial), Markdown-Notizen und Dateianhängen.
- 🗂️ **Spaced Repetition Karteikarten:** Wissenschaftlich fundiertes Lernen (SM-2 Algorithmus) mit Selbsteinschätzung und Tagesabfragen.
- 📝 **Rich-Text Notizen:** Leistungsstarker Editor für Zusammenfassungen, Formeln und Skripte.
- 📋 **Kanban Taskcards:** Aufgabenmanagement mit Farbkennzeichnung und Priorisierung.
- ⏳ **Interaktive Zeitleisten:** Chronologische Ereignisse und Geschichtsabläufe visualisieren.
- 🎯 **Prüfungsplan & Fehleranalyse:** Prüfungstermine verwalten, Fehler kategorisieren und Wissenslücken gezielt schließen.
- 🤖 **Optionale KI-Unterstützung:** Dokumentenanalyse und automatische Kartengenerierung via Gemini, OpenRouter oder lokalem Ollama (API-Key bleibt nur im Browser gespeichert).

---

## 🚀 Veröffentlichung auf GitHub Pages (Schritt-für-Schritt)

Dieses Repository ist bereits so vorkonfiguriert, dass GitHub Pages die Website vollautomatisch erstellt und hostet.

### Option 1: Per Git & GitHub Actions (Empfohlen)

1. **Neues GitHub-Repository erstellen:**
   - Gehe auf [GitHub](https://github.com) und erstelle ein neues, öffentliches (oder privates) Repository, z. B. `learnmap`.
   
2. **Dateien hochladen:**
   - Öffne ein Terminal in diesem Ordner und führe aus:
     ```bash
     git init
     git add .
     git commit -m "Initial commit for LearnMap GitHub Pages"
     git branch -M main
     git remote add origin https://github.com/<DEIN-BENUTZERNAME>/<DEIN-REPO-NAME>.git
     git push -u origin main
     ```
   *(Alternativ kannst du die Dateien auch direkt über die GitHub-Website per Drag-and-Drop hochladen).*

3. **GitHub Pages aktivieren:**
   - Gehe in deinem GitHub-Repository auf **Settings** (Einstellungen).
   - Klicke in der linken Seitenleiste auf **Pages**.
   - Wähle unter **Build and deployment** > **Source** die Option:
     👉 **`GitHub Actions`**
   - GitHub führt nun den hinterlegten Workflow (`.github/workflows/deploy.yml`) automatisch aus.
   - Nach ca. 1–2 Minuten ist deine Website live unter:  
     `https://<DEIN-BENUTZERNAME>.github.io/<DEIN-REPO-NAME>/`

---

### Option 2: Manuelle Bereitstellung (Über den `dist`-Ordner)

Falls du GitHub Actions nicht nutzen möchtest, kannst du auch den im Ordner `dist/` bereits fertig kompilierten Web-Build verwenden:

1. Lade den Inhalt des Ordners `dist` in den Branch `gh-pages` deines Repositories hoch.
2. Wähle unter **Settings** > **Pages** > **Source** den Branch `gh-pages` und den Ordner `/ (root)`.
3. Speichern – die Website ist sofort online!

---

## 💻 Lokale Entwicklung & Start

Du kannst LearnMap auch jederzeit lokal auf deinem Computer ausführen oder weiterentwickeln:

### Voraussetzungen
- [Node.js](https://nodejs.org) (Version 18 oder neuer)

### Befehle

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Lokalen Entwicklungsserver starten
npm run dev

# 3. Produktions-Build erstellen
npm run build

# 4. Vorschau des Builds ansehen
npm run preview
```

---

## 📦 Projektstruktur

```text
├── .github/
│   └── workflows/
│       └── deploy.yml        # Automatischer GitHub-Pages-Build- und Deploy-Workflow
├── dist/                     # Fertig vorkompilierte Website (sofort einsatzbereit)
├── public/                   # Statische Assets (Favicon, Icons)
├── src/                      # Vollständiger TypeScript & React Quellcode
│   ├── components/           # UI-Komponenten (Sidebar, Button, Modal etc.)
│   ├── features/             # Funktionsmodule (Mindmaps, Flashcards, Notes, Settings etc.)
│   ├── services/             # Speicher- und Synchronisationsdienste
│   ├── store/                # Zustand-Store mit Local-First Persistenz
│   └── types/                # TypeScript Typdefinitionen
├── index.html                # Einstiegsseite
├── package.json              # Paketdefinition & Abhängigkeiten
├── vite.config.ts            # Vite-Konfiguration (optimiert für relative Pfade & GitHub Pages)
└── README.md                 # Diese Dokumentation
```

---

## 💾 Datensicherheit & Export-Tipps für Nutzer

- **Automatisches Speichern:** Jede Änderung wird sofort im Browser (`LocalStorage`) und größere Daten in `IndexedDB` gespeichert.
- **Regelmäßige Backups:** Klicke unten links auf `Einstellungen` ➔ `Jetzt als Backup herunterladen (JSON)`, um deinen Datenbestand auf deiner Festplatte als Datei abzuspeichern.
- **Gerätewechsel:** Lade deine gespeicherte JSON-Datei auf einem beliebigen anderen PC oder Smartphone über `Backup-Datei auswählen` wieder hoch.

---

## 📄 Lizenz
MIT License – Freie Verwendung für persönliche und akademische Zwecke.
