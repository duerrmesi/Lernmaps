# 🧠 LearnMap

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8.svg)](https://tailwindcss.com/)
[![Local--First](https://img.shields.io/badge/Privacy-100%25%20Local--First-emerald.svg)](#-datenschutz--local-first-architektur)

> **Die all-in-one Lern- und Wissensmanagement-Plattform.**  
> Kombiniere interaktive Mindmaps, Spaced-Repetition-Karteikarten, Notizen, Taskcards, Zeitleisten und KI-Unterstützung in einer intuitiven, hochperformanten Web-App.

🌐 **Live-Web-App:** [https://duerrmesi.github.io/Lernmaps/](https://duerrmesi.github.io/Lernmaps/)

---

## 🔒 Datenschutz & Local-First Architektur

LearnMap wurde von Grund auf nach dem **Local-First-Prinzip** entwickelt. Obwohl die Anwendung öffentlich über das Web (z. B. auf GitHub Pages) erreichbar ist, bleiben deine Daten zu 100 % privat auf deinem Computer:

- **Keine Serverdatenbank:** Es gibt keinen zentralen Server, der deine Notizen oder Lerninhalte speichert.
- **Speicherung im Browser:** Alle Projekte, Mindmaps, Karteikarten und Einstellungen liegen in der gesicherten Sandbox deines lokalen Browsers (`LocalStorage`). Bilder und Dateianhänge werden direkt in deiner lokalen `IndexedDB` abgelegt.
- **Volle Offline-Fähigkeit:** Einmal im Browser geladen, funktioniert LearnMap auch komplett ohne bestehende Internetverbindung.
- **Einfache Backups:** Exportiere deine gesamten Lerninhalte jederzeit mit einem Klick als JSON-Datei und stelle sie auf jedem beliebigen anderen Gerät wieder her.

---

## ✨ Funktionen im Überblick

| Modul | Beschreibung |
| :--- | :--- |
| 🗺️ **Interaktive Mindmaps** | Drag & Drop Wissensgraphen, hierarchisches Auto-Layout (Dagre & Radial), Markdown-Notizen und Dateianhänge direkt an Knoten. |
| 🗂️ **Spaced Repetition** | Karteikartensystem nach dem wissenschaftlichen SM-2-Algorithmus (SuperMemo/Anki) mit automatischer Wiederholungsplanung. |
| 📝 **Rich-Text Notizen** | Strukturierter Editor für Zusammenfassungen, Skripte, Codeblöcke und Formeln. |
| 📋 **Taskcards** | Kanban-ähnliches Aufgabenboard mit Farbkategorien, Fälligkeitsdaten und Priorisierung. |
| ⏳ **Interaktive Zeitleisten** | Chronologische Visualisierung von historischen Ereignissen, Prozessen und Entwicklungen. |
| 🎯 **Prüfungsmanagement** | Prüfungssimulation, Wissensstand-Tracking und gezielte Fehleranalyse für schwache Themenbereiche. |
| 🤖 **Smarter KI-Import** | Dokumenten- und Klausuranalyse (PDF/Text) zur automatischen Generierung von Mindmaps und Karteikarten via Gemini, OpenRouter oder lokalem Ollama. |

---

## 🚀 Schnelleinstieg & Lokale Entwicklung

Du kannst LearnMap sowohl direkt online nutzen als auch lokal auf deinem PC ausführen:

### Voraussetzungen
- [Node.js](https://nodejs.org) (Version 18 oder neuer)
- npm oder pnpm

### Installation

```bash
# 1. Repository klonen
git clone https://github.com/duerrmesi/Lernmaps.git
cd Lernmaps

# 2. Abhängigkeiten installieren
npm install

# 3. Lokalen Entwicklungsserver starten
npm run dev
```

Die Anwendung öffnet sich automatisch unter `http://localhost:5173`.

### Produktions-Build erstellen

```bash
npm run build
npm run preview
```

---

## 🛠️ Veröffentlichung auf GitHub Pages

LearnMap enthält eine vorkonfigurierte GitHub Actions Pipeline (`.github/workflows/deploy.yml`):

1. Gehe in deinem GitHub-Repository auf **Settings** ➔ **Pages**.
2. Wähle unter **Build and deployment** > **Source**:  
   👉 **`GitHub Actions`**  
   *(Alternativ: Wähle `Deploy from a branch` mit dem Branch `gh-pages`)*.
3. Jeder Push auf den Branch `main` baut und aktualisiert deine Live-Website vollautomatisch.

---

## 📦 Verwendete Technologien

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Graph & Mindmap Engine:** [@xyflow/react](https://reactflow.dev/) (React Flow)
- **Graph Layouting:** [@dagrejs/dagre](https://github.com/dagrejs/dagre)
- **Editor:** [TipTap](https://tiptap.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) mit benutzerdefinierter Persistenz
- **Client Storage:** LocalStorage & [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📄 Lizenz

Dieses Projekt steht unter der [MIT Lizenz](LICENSE).  
Frei nutzbar für private, schulische und universitäre Zwecke.
