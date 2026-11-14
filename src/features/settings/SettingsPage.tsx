import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Check, Download, Upload, Clipboard, HardDrive, RefreshCw, Copy } from 'lucide-react';
import { useImportStore, type AIProvider } from '../import/importStore';
import { Button } from '../../components/Button';
import { useStorageStatus, saveToDisk, loadFromDisk } from '../../services/storageSync';
import { useStore, importFullState } from '../../store';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (lokal)',
};

const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  gemini: 'Empfohlen. Kostenlos nutzbar mit einem Google AI Studio API-Key.',
  openrouter: 'Zugang zu vielen Modellen (GPT-4, Claude, Llama) über einen einzigen Key.',
  ollama: 'Vollständig lokal. Kein API-Key nötig. Ollama muss auf diesem Gerät installiert sein.',
};

const PROVIDER_KEY_LABEL: Record<AIProvider, string> = {
  gemini: 'Gemini API Key (von AI Studio)',
  openrouter: 'OpenRouter API Key',
  ollama: 'Ollama Base URL (z.B. http://localhost:11434)',
};

const PROVIDER_KEY_PLACEHOLDER: Record<AIProvider, string> = {
  gemini: 'Key 1, Key 2, Key 3... (mit Komma getrennt)',
  openrouter: 'sk-or-... (mehrere mit Komma getrennt)',
  ollama: 'http://localhost:11434',
};

export const SettingsPage: React.FC = () => {
  const { provider, setProvider, apiKeys, setApiKey, models, setModel } = useImportStore();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const storage = useStorageStatus();
  const [copiedPath, setCopiedPath] = useState(false);
  const [diskActionMsg, setDiskActionMsg] = useState<string | null>(null);

  const handleManualDiskSave = async () => {
    const state = useStore.getState();
    const ok = await saveToDisk({ state, version: 0 });
    if (ok) {
      setDiskActionMsg('Erfolgreich auf Festplatte gespeichert!');
      setTimeout(() => setDiskActionMsg(null), 3000);
    } else {
      setDiskActionMsg('Fehler beim Speichern auf Festplatte.');
      setTimeout(() => setDiskActionMsg(null), 3000);
    }
  };

  const handleManualDiskReload = async () => {
    const data = await loadFromDisk();
    if (data) {
      const ok = importFullState(data);
      if (ok) {
        setDiskActionMsg('Daten erfolgreich von der Festplatte geladen!');
        setTimeout(() => setDiskActionMsg(null), 3000);
      }
    } else {
      setDiskActionMsg('Keine gespeicherte Datei auf der Festplatte gefunden.');
      setTimeout(() => setDiskActionMsg(null), 3000);
    }
  };

  const handleCopyPath = () => {
    if (storage.filePath) {
      navigator.clipboard.writeText(storage.filePath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handleExportBackup = () => {
    const data = localStorage.getItem('learnmap-storage') || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learnmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        importFullState(parsed);
        alert('Backup erfolgreich wiederhergestellt und auf Festplatte gesichert!');
      } catch {
        alert('Fehler beim Lesen der Backup-Datei: Ungültiges JSON-Format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteBackup = () => {
    const raw = prompt('Füge hier den JSON-Inhalt deines Backups oder aus Port 5173 ein:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      importFullState(parsed);
      alert('Daten erfolgreich eingefügt und auf Festplatte gesichert!');
    } catch {
      alert('Ungültiges JSON-Format!');
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentKey = apiKeys[provider];

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-semibold text-text-primary mb-1">Einstellungen</h1>
          <p className="text-[13px] text-text-secondary">Grundlegende App-Einstellungen</p>
        </div>

        {/* KI-Integration Section */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-text-primary mb-1">KI-Integration</h2>
          <p className="text-[12px] text-text-disabled mb-4">
            Die KI ist optional. Alle Grundfunktionen (Karteikarten, Lernmodus, Klausuren) funktionieren ohne KI.
            API-Keys werden nur im Arbeitsspeicher gehalten und nie lokal gespeichert.
          </p>

          {/* Provider selection */}
          <p className="text-[12px] text-text-secondary mb-4">
            <strong>Tipp für Power-User:</strong> Du kannst mehrere API-Keys (getrennt durch Komma) eintragen. Das System wählt dann bei jeder Anfrage zufällig einen Key aus, um Rate-Limits zu umgehen.
          </p>
          <div className="space-y-2 mb-5">
            {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                  provider === p
                    ? 'border-text-primary bg-bg-secondary'
                    : 'border-border hover:border-border-strong hover:bg-bg-secondary'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[13px] font-medium text-text-primary">{PROVIDER_LABELS[p]}</span>
                  {provider === p && <Check size={13} className="text-text-primary" />}
                </div>
                <span className="text-[11px] text-text-disabled">{PROVIDER_DESCRIPTIONS[p]}</span>
              </button>
            ))}
          </div>

          {/* API Key input */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-text-secondary block mb-1.5">
              {PROVIDER_KEY_LABEL[provider]}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={currentKey}
                  onChange={e => setApiKey(provider, e.target.value)}
                  placeholder={PROVIDER_KEY_PLACEHOLDER[provider]}
                  className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary pr-9"
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary"
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <Button onClick={handleSave} size="sm" disabled={!currentKey.trim()}>
                {saved ? <Check size={12} /> : 'Speichern'}
              </Button>
            </div>
            {provider === 'gemini' && (
              <p className="text-[11px] text-text-disabled mt-1.5">
                Kostenlosen Key erhalten:{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-secondary underline hover:text-text-primary"
                >
                  aistudio.google.com/apikey
                </a>
              </p>
            )}
            {provider === 'openrouter' && (
              <p className="text-[11px] text-text-disabled mt-1.5">
                Key erhalten:{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-secondary underline hover:text-text-primary"
                >
                  openrouter.ai/keys
                </a>
              </p>
            )}
          </div>

          {currentKey && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
              <Check size={11} />
              Key/URL gesetzt (nur im Arbeitsspeicher, wird beim Neuladen zurückgesetzt)
            </div>
          )}

          {/* Model selection */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-text-secondary block mb-1.5">
              Ausgewähltes Modell ({PROVIDER_LABELS[provider]})
            </label>
            {provider === 'gemini' && (
              <select
                value={models[provider]}
                onChange={e => setModel(provider, e.target.value)}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Kostenlos, Schnell & Stabil - Empfohlen)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Kostenlos, Höchste Intelligenz)</option>
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Kostenlos, Ultra-Schnell)</option>
              </select>
            )}
            {provider === 'openrouter' && (
              <select
                value={models[provider]}
                onChange={e => setModel(provider, e.target.value)}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="google/gemini-3.8-flash">Gemini 3.8 Flash</option>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
              </select>
            )}
            {provider === 'ollama' && (
              <input
                type="text"
                value={models[provider]}
                onChange={e => setModel(provider, e.target.value)}
                placeholder="z.B. llama3 oder mistral"
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-6" />

        {/* Data Section */}
        <div>
          <h2 className="text-[13px] font-semibold text-text-primary mb-1">
            {storage.isWebMode ? 'Lokale Datenspeicherung (Local-First)' : 'Dauerhafte lokale Festplatten-Speicherung'}
          </h2>
          <p className="text-[12px] text-text-secondary mb-4">
            {storage.isWebMode ? (
              <>
                Alle deine Mindmaps, Projekte, Verbindungen, Notizen und Karteikarten werden <strong>vollständig lokal auf deinem Computer</strong> in deinem Browser gespeichert (LocalStorage &amp; IndexedDB). Deine Daten sind 100% privat und werden <strong>niemals an GitHub oder einen Server übertragen</strong>.
              </>
            ) : (
              <>
                Alle deine Mindmaps, Projekte, Verbindungen, Notizen und Karteikarten werden automatisch dauerhaft in einer
                echten Datei auf deiner lokalen Festplatte gespeichert. Dadurch gehen Daten bei Portwechseln (z.&nbsp;B. Port 5173 &rarr; 5174)
                oder beim Leeren des Browser-Caches <strong>nie verloren</strong>.
              </>
            )}
          </p>

          {/* Local Disk / Web Status Card */}
          <div className="border border-border rounded-lg p-4 bg-bg-secondary mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={15} className="text-text-primary" />
                <span className="text-[12.5px] font-medium text-text-primary">
                  {storage.isWebMode ? 'Speicher-Status:' : 'Dateisystem-Status:'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {storage.status === 'saving'
                  ? 'Wird gespeichert...'
                  : storage.isWebMode
                  ? 'Lokal im Browser gesichert'
                  : 'Lokal auf Festplatte gesichert'}
              </span>
            </div>

            <div className="text-[11.5px] text-text-secondary space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-text-disabled shrink-0">Speicherort:</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-[10.5px] text-text-primary truncate select-all" title={storage.filePath}>
                    {storage.filePath}
                  </span>
                  {!storage.isWebMode && (
                    <button
                      onClick={handleCopyPath}
                      className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      title="Pfad kopieren"
                    >
                      {copiedPath ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {storage.lastSaved && (
                <div className="flex items-center justify-between">
                  <span className="text-text-disabled">Zuletzt gespeichert:</span>
                  <span className="text-text-primary">
                    {storage.lastSaved.toLocaleDateString()} um {storage.lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {diskActionMsg && (
              <div className="text-[11px] px-2.5 py-1.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                {diskActionMsg}
              </div>
            )}

            {!storage.isWebMode && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManualDiskSave}
                  className="flex items-center gap-1.5 text-[11.5px]"
                >
                  <HardDrive size={12} /> Jetzt auf Festplatte sichern
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManualDiskReload}
                  className="flex items-center gap-1.5 text-[11.5px]"
                >
                  <RefreshCw size={12} /> Von Festplatte neu laden
                </Button>
              </div>
            )}
          </div>

          <h3 className="text-[12px] font-semibold text-text-primary mb-1">Manuelle Backups & Port-Übertragung</h3>
          <p className="text-[11.5px] text-text-disabled mb-3">
            Zusätzlich zur automatischen Festplatten-Speicherung kannst du jederzeit JSON-Dateien manuell herunterladen oder alte Backups einspielen.
          </p>

          <input
            type="file"
            ref={backupInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5"
            >
              <Download size={13} /> Backup herunterladen (JSON)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => backupInputRef.current?.click()}
              className="flex items-center gap-1.5"
            >
              <Upload size={13} /> Backup einspielen (Datei)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handlePasteBackup}
              className="flex items-center gap-1.5"
            >
              <Clipboard size={13} /> Daten direkt einfügen (von Port 5173)
            </Button>
          </div>

          <button
            className="text-[12px] text-red-500 hover:text-red-600 hover:underline cursor-pointer"
            onClick={() => {
              if (window.confirm('Alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Alle Daten löschen
          </button>
        </div>
      </div>
    </div>
  );
};
