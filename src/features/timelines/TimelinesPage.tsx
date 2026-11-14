import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, useTimelinesByProject } from '../../store';
import { formatDate } from '../../utils';
import { Milestone, Plus, ChevronRight, Sparkles } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { AITimelineModal } from './AITimelineModal';

export const TimelinesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, timelineEvents, createTimeline } = useStore();

  const project = projectId ? projects[projectId] : null;
  const projectTimelines = useTimelinesByProject(projectId || '');

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!project || !projectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary text-sm">Projekt nicht gefunden.</p>
      </div>
    );
  }

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const tl = createTimeline(projectId, newTitle.trim(), newDesc.trim());
    setShowNewModal(false);
    setNewTitle('');
    setNewDesc('');
    navigate(`/projects/${projectId}/timelines/${tl.id}`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-[11px] text-text-disabled hover:text-text-secondary transition-colors mb-4 block"
        >
          ← {project.title}
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Zeitstrahlen
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Erstelle visuelle Zeitsträhle für dieses Projekt.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-purple-600" /> Mit KI erstellen
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
              <Plus size={12} strokeWidth={2.5} /> Neuer Zeitstrahl
            </Button>
          </div>
        </div>

        {/* List */}
        {projectTimelines.length === 0 ? (
          <EmptyState
            icon={<Milestone size={32} />}
            title="Noch kein Zeitstrahl angelegt"
            description="Erstelle deinen ersten Zeitstrahl, um historische Abfolgen, Phasen oder Prozesse visuell zu strukturieren."
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAIModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-purple-600" /> Zeitstrahl mit KI
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
                  <Plus size={12} /> Zeitstrahl anlegen
                </Button>
              </div>
            }
          />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-white shadow-2xs divide-y divide-border">
            {projectTimelines.map((tl) => {
              const eventsCount = Object.values(timelineEvents || {}).filter(
                (e) => e.timelineId === tl.id
              ).length;

              return (
                <button
                  key={tl.id}
                  onClick={() => navigate(`/projects/${projectId}/timelines/${tl.id}`)}
                  className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary transition-colors text-left group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-bg-secondary text-text-secondary group-hover:bg-accent-muted group-hover:text-accent flex items-center justify-center shrink-0 transition-colors mt-0.5">
                      <Milestone size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                          {tl.title}
                        </span>
                        <span className="text-[10px] text-text-disabled bg-bg-secondary px-1.5 py-0.5 rounded border border-border">
                          {eventsCount} {eventsCount === 1 ? 'Ereignis' : 'Ereignisse'}
                        </span>
                      </div>
                      {tl.description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                          {tl.description}
                        </p>
                      )}
                      <p className="text-[11px] text-text-disabled mt-1">
                        Zuletzt aktualisiert: {formatDate(tl.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-text-disabled group-hover:text-accent transition-colors shrink-0 ml-4"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* New Timeline Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Neuen Zeitstrahl anlegen"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Titel *"
            placeholder="z.B. Verlauf des Ersten Weltkriegs"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <Input
            label="Beschreibung (optional)"
            placeholder="Kurze Notiz zum Thema oder Fokus"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex justify-end gap-1.5 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" disabled={!newTitle.trim()} onClick={handleCreate}>
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Timeline Modal */}
      <AITimelineModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        projectId={projectId}
      />
    </div>
  );
};
