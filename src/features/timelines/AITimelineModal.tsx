import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useStore } from '../../store';
import { useImportStore } from '../import/importStore';
import { AIService } from '../import/AIService';

interface AITimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  targetTimelineId?: string;
  targetTimelineTitle?: string;
}

const TOPIC_SUGGESTIONS = [
  'Französische Revolution (1789-1799)',
  'Weimarer Republik (1918-1933)',
  'Geschichte des Internets & Web',
  'Entwicklung der Künstlichen Intelligenz',
  'Evolution des Menschen',
  'Ablauf der Mitose (Zellzyklus)',
  'Der Kalte Krieg (1947-1991)',
  'Projektphasen im Software-Engineering',
];

export const AITimelineModal: React.FC<AITimelineModalProps> = ({
  isOpen,
  onClose,
  projectId: initialProjectId,
  targetTimelineId,
  targetTimelineTitle,
}) => {
  const navigate = useNavigate();
  const { projects, createTimeline, createTimelineEvent, timelineEvents } = useStore();
  const { provider, apiKeys, setApiKey, models } = useImportStore();

  const projectList = Object.values(projects || {});
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projectList[0]?.id || ''
  );

  const [topic, setTopic] = useState('');
  const [eventCount, setEventCount] = useState<number>(8);
  const [focus, setFocus] = useState('wichtigste Meilensteine, Wendepunkte und chronologische Phasen');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline API key input in case user hasn't set one yet
  const currentKey = apiKeys[provider] || '';
  const [inlineKey, setInlineKey] = useState('');

  if (!isOpen) return null;

  const isAppending = Boolean(targetTimelineId);
  const effectiveProjectId = initialProjectId || selectedProjectId;

  const handleGenerate = async () => {
    const keyToUse = (currentKey || inlineKey).trim();
    if (!keyToUse) {
      setErrorMsg('Bitte hinterlege zuerst einen API-Key für den KI-Provider.');
      return;
    }

    if (inlineKey && !currentKey) {
      setApiKey(provider, inlineKey.trim());
    }

    if (!isAppending && !topic.trim()) {
      setErrorMsg('Bitte gib ein Thema für den Zeitstrahl ein.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isAppending && targetTimelineId) {
        // Find existing events to avoid duplicates
        const existing = Object.values(timelineEvents || {})
          .filter((e) => e.timelineId === targetTimelineId)
          .map((e) => ({ title: e.title, date: e.date }));

        const newEvents = await AIService.generateTimelineEvents(
          targetTimelineTitle || 'Zeitstrahl',
          existing,
          { count: eventCount, focus },
          provider,
          keyToUse,
          models[provider]
        );

        if (!newEvents || newEvents.length === 0) {
          throw new Error('Die KI konnte keine zusätzlichen Ereignisse generieren.');
        }

        newEvents.forEach((ev) => {
          createTimelineEvent(targetTimelineId, effectiveProjectId, {
            title: ev.title,
            description: ev.description,
            date: ev.date,
            endDate: ev.endDate,
            category: ev.category,
            color: ev.color,
            importance: ev.importance,
          });
        });

        setIsLoading(false);
        onClose();
      } else {
        // Create brand new timeline
        const generated = await AIService.generateTimeline(
          topic.trim(),
          { count: eventCount, focus },
          provider,
          keyToUse,
          models[provider]
        );

        if (!generated || !generated.events || generated.events.length === 0) {
          throw new Error('Die KI hat keine Ereignisse für diesen Zeitstrahl generiert.');
        }

        const newTl = createTimeline(
          effectiveProjectId,
          generated.title || topic.trim(),
          generated.description || 'Automatisch generierter Zeitstrahl'
        );

        generated.events.forEach((ev) => {
          createTimelineEvent(newTl.id, effectiveProjectId, {
            title: ev.title,
            description: ev.description,
            date: ev.date,
            endDate: ev.endDate,
            category: ev.category,
            color: ev.color,
            importance: ev.importance,
          });
        });

        setIsLoading(false);
        onClose();
        navigate(`/projects/${effectiveProjectId}/timelines/${newTl.id}`);
      }
    } catch (err: any) {
      console.error('AI Timeline Generation error:', err);
      setIsLoading(false);
      setErrorMsg(err?.message || 'Fehler beim Erstellen des Zeitstrahls mit KI.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAppending ? '✨ Ereignisse mit KI ergänzen' : '✨ Zeitstrahl mit KI erstellen'}
      size="lg"
    >
      <div className="space-y-4 pt-1">
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          {isAppending
            ? `Ergänze den Zeitstrahl "${targetTimelineTitle}" um zusätzliche historische Meilensteine oder Ereignisse.`
            : 'Gib ein Thema, eine Epoche oder einen Text ein. Die KI strukturiert automatisch alle Meilensteine mit Daten, Kategorien und Erklärungen.'}
        </p>

        {/* Project Selector (if not scoped to a specific project) */}
        {!initialProjectId && !isAppending && (
          <div>
            <label className="text-[11.5px] font-medium text-text-secondary block mb-1">
              Ziel-Projekt
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isLoading}
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Topic Input (if not appending) */}
        {!isAppending && (
          <div>
            <label className="text-[11.5px] font-medium text-text-secondary block mb-1">
              Thema, Epoche oder Ereignisabfolge
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Französische Revolution, Weimarer Republik, Geschichte des Internets..."
              disabled={isLoading}
              className="w-full text-[13px]"
              autoFocus
            />

            {/* Quick Suggestions */}
            <div className="mt-2">
              <span className="text-[10.5px] text-text-disabled block mb-1">Vorschläge:</span>
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTopic(sug)}
                    disabled={isLoading}
                    className="text-[10.5px] bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary px-2 py-0.5 rounded border border-border transition-colors text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Event Count & Focus Options */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11.5px] font-medium text-text-secondary block mb-1">
              Anzahl Ereignisse
            </label>
            <select
              value={eventCount}
              onChange={(e) => setEventCount(Number(e.target.value))}
              disabled={isLoading}
              className="w-full text-[12.5px] bg-bg-secondary border border-border rounded px-2.5 py-1.5 text-text-primary"
            >
              <option value={5}>5 Meilensteine (Kompakt)</option>
              <option value={8}>8 Meilensteine (Empfohlen)</option>
              <option value={12}>12 Meilensteine (Detailliert)</option>
              <option value={16}>16 Meilensteine (Umfassend)</option>
            </select>
          </div>

          <div>
            <label className="text-[11.5px] font-medium text-text-secondary block mb-1">
              Fokus
            </label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              disabled={isLoading}
              className="w-full text-[12.5px] bg-bg-secondary border border-border rounded px-2.5 py-1.5 text-text-primary"
            >
              <option value="wichtigste Meilensteine, Wendepunkte und chronologische Phasen">
                Meilensteine & Wendepunkte
              </option>
              <option value="vollständige chronologische Übersicht aller Kernereignisse">
                Chronologische Übersicht
              </option>
              <option value="Ursachen, Auslöser, Verlauf und historische Folgen">
                Ursache, Verlauf & Wirkung
              </option>
              <option value="wichtige Persönlichkeiten, Entdeckungen und Meilensteine">
                Entdeckungen & Akteure
              </option>
            </select>
          </div>
        </div>

        {/* API Key requirement check */}
        {!currentKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 space-y-2">
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>Kein API-Key für {provider.toUpperCase()} hinterlegt</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Trage hier direkt deinen Key ein (oder in den Einstellungen):
            </p>
            <input
              type="password"
              value={inlineKey}
              onChange={(e) => setInlineKey(e.target.value)}
              placeholder="API-Key hier einfügen..."
              className="w-full text-[12px] bg-white border border-amber-300 rounded px-2.5 py-1.5 text-text-primary"
            />
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-600 text-[11.5px] flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading || (!isAppending && !topic.trim())}
            className="flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Generiere Zeitstrahl...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>{isAppending ? 'Ereignisse generieren' : 'Zeitstrahl erstellen'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
