# 📘 Schritt-für-Schritt Anleitung: LearnMap auf GitHub Pages online stellen

Diese Anleitung erklärt dir einfach und verständlich, wie du dein LearnMap-Projekt auf GitHub veröffentlichst, sodass jeder über einen Link darauf zugreifen kann – während alle persönlichen Daten trotzdem sicher auf dem PC jedes einzelnen Nutzers bleiben.

---

## 🧭 Inhaltsverzeichnis
1. [Warum bleiben die Daten lokal?](#1-warum-bleiben-die-daten-lokal)
2. [Vorbereitung (GitHub Account)](#2-vorbereitung)
3. [Methode A: Über GitHub Website (Ohne Terminal / Drag & Drop)](#3-methode-a-über-github-website-ohne-terminal)
4. [Methode B: Über Git & Terminal (Empfohlen für Entwickler)](#4-methode-b-über-git--terminal)
5. [GitHub Pages aktivieren (Wichtig!)](#5-github-pages-aktivieren-wichtig)
6. [Häufige Fragen & Troubleshooting](#6-häufige-fragen--troubleshooting)

---

## 1. Warum bleiben die Daten lokal?
- **GitHub Pages liefert nur die App aus:** GitHub Pages stellt nur die Webseite bereit (HTML, JavaScript und CSS). Es gibt keinen GitHub-Server, der Daten speichert.
- **Speicherort im Browser:** Wenn ein Nutzer die Seite öffnet, speichert sein eigener Browser (Edge, Chrome, Firefox, Safari) alle Karten, Notizen und Mindmaps in der sogenannten `LocalStorage` und `IndexedDB`.
- **100% Privatsphäre:** Deine Lerninhalte verlassen niemals deinen eigenen Rechner.

---

## 2. Vorbereitung
- Du benötigst ein kostenloses Konto auf [GitHub.com](https://github.com).
- Erstelle ein neues Repository:
  1. Klicke oben rechts auf das **`+`**-Symbol und wähle **`New repository`**.
  2. Vergib einen Namen, z. B. **`learnmap`**.
  3. Wähle **Public** (Öffentlich).
  4. Lass alle Häkchen (Add README, .gitignore) **leer**, da wir bereits alle Dateien vorbereitet haben.
  5. Klicke auf **`Create repository`**.

---

## 3. Methode A: Über GitHub Website (Ohne Terminal)
Wenn du Git nicht auf der Kommandozeile nutzen möchtest:

1. **ZIP-Datei erstellen:**
   - Packe alle Dateien aus diesem Ordner (`github-learnmap`) in eine ZIP-Datei (oder markiere alle Dateien).
2. **Dateien auf GitHub hochladen:**
   - Auf der Seite deines neu erstellten Repositories findest du den Link **`uploading an existing file`**.
   - Ziehe alle Dateien und Ordner (wichtig: inklusive des versteckten `.github`-Ordners!) in das Browserfenster.
   - Klicke unten auf den grünen Button **`Commit changes`**.
3. Fahre mit [Schritt 5 (GitHub Pages aktivieren)](#5-github-pages-aktivieren-wichtig) fort.

---

## 4. Methode B: Über Git & Terminal (Empfohlen)

Öffne ein Terminal (z. B. PowerShell oder Eingabeaufforderung) in diesem Ordner `github-learnmap` und führe folgende Befehle aus:

```powershell
# 1. Git Repository initialisieren
git init

# 2. Alle vorbereiteten Dateien vormerken
git add .

# 3. Ersten Commit erstellen
git commit -m "LearnMap Release fuer GitHub Pages"

# 4. Hauptzweig auf 'main' setzen
git branch -M main

# 5. Dein GitHub Repository als Remote verknüpfen (ersetze BENUTZERNAME und REPO)
git remote add origin https://github.com/DEIN_BENUTZERNAME/learnmap.git

# 6. Dateien zu GitHub hochladen
git push -u origin main
```

---

## 5. GitHub Pages aktivieren (Wichtig!)

Damit deine Website erreichbar wird:

1. Öffne dein Repository auf **GitHub**.
2. Klicke oben auf **Settings** (mit dem Zahnrad-Symbol).
3. Klicke in der linken Menüleiste auf **Pages** (unter *Code and automation*).
4. Unter **Build and deployment**:
   - Suche das Dropdown-Feld **Source**.
   - Wähle **`GitHub Actions`** aus.
5. Das war's!
   - GitHub startet nun automatisch den in `.github/workflows/deploy.yml` hinterlegten Bau- und Veröffentlichungsprozess.
   - Nach ca. 60–90 Sekunden siehst du oben auf der Pages-Seite einen Link mit einem grünen Häkchen:
     🌐 **`https://<dein-benutzername>.github.io/<repo-name>/`**

Klicke auf den Link – deine LearnMap läuft live im Web!

---

## 6. Häufige Fragen & Troubleshooting

### Gehen meine Daten verloren, wenn ich den Browser schließe?
Nein! Der Browser behält die Daten dauerhaft im LocalStorage. 

### Wie kann ich meine Daten sichern oder auf einen anderen Computer mitnehmen?
1. Klicke in LearnMap unten links auf **Einstellungen**.
2. Scrolle zu *Manuelle Backups* und klicke auf **Backup herunterladen (JSON)**.
3. Du erhältst eine Datei `learnmap-backup-YYYY-MM-DD.json`.
4. Auf dem anderen PC öffnest du einfach dieselbe Webseite und klickst auf **Backup wiederherstellen**.

### Warum gibt es keinen "Speicherfehler" mehr auf GitHub Pages?
Wir haben das Speichersystem so aktualisiert, dass es automatisch erkennt, ob ein lokaler Node-Server läuft (z. B. bei `npm run dev`) oder ob die App im Web auf GitHub Pages aufgerufen wird. Im Web schaltet LearnMap nahtlos in den *Browser-First-Modus* und speichert direkt und lautlos lokal.
