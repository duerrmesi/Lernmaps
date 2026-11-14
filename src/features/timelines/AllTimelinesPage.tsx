import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { Milestone, Plus } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import type { Timeline } from '../../types';

export const AllTimelinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { timelines, timelineEvents, projects, createTimeline } = useStore();
  const allTimelines = Object.values(timelines || {}).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  ) as Timeline[];

  const projectList = Object.values(projects || {});

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectList[0]?.id || ''
  );

  const handleCreate = () => {
    if (!newTitle.trim() || !selectedProjectId) return;
    const tl = createTimeline(selectedProjectId, newTitle.trim(), newDesc.trim());
    setShowNewModal(false);
    setNewTitle('');
    setNewDesc('');
    navigate(`/projects/${selectedProjectId}/timelines/${tl.id}`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-medium text-text-primary tracking-tight">
              Zeitstrahlen
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Erstelle und verwalte chronologische Abläufe, historische Meilensteine und Entwicklungen.
            </p>
          </div>
          {projectList.length > 0 && (
            <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
              <Plus size={12} strokeWidth={2.5} /> Neuer Zeitstrahl
            </Button>
          )}
        </div>

        {allTimelines.length === 0 ? (
          <EmptyState
            icon={<Milestone size={32} />}
            title="Noch keine Zeitstrahlen"
            description="Erstelle deinen ersten Zeitstrahl, um Ereignisse und Meilensteine visuell darzustellen."
            action={
              projectList.length > 0 ? (
                <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
                  <Plus size={12} /> Zeitstrahl erstellen
                </Button>
              ) : (
                <button
                  onClick={() => navigate('/projects')}
                  className="text-sm text-accent hover:underline"
                >
                  Erstelle zuerst ein Projekt
                </button>
              )
            }
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden bg-white shadow-2xs divide-y divide-border">
            {allTimelines.map((t) => {
              const project = projects[t.projectId];
              const eventsCount = Object.values(timelineEvents || {}).filter(
                (e) => e.timelineId === t.id
              ).length;

              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/projects/${t.projectId}/timelines/${t.id}`)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded bg-bg-secondary text-text-secondary group-hover:bg-accent-muted group-hover:text-accent flex items-center justify-center shrink-0 transition-colors">
                    <Milestone size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-ui font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                        {t.title}
                      </p>
                      <span className="text-[10px] text-text-disabled bg-bg-secondary px-1.5 py-0.5 rounded border border-border">
                        {eventsCount} {eventsCount === 1 ? 'Ereignis' : 'Ereignisse'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-disabled">
                      {project && <span className="truncate">{project.title}</span>}
                      {t.description && (
                        <>
                          <span>•</span>
                          <span className="truncate">{t.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-text-disabled shrink-0">
                    {formatDate(t.updatedAt)}
                  </span>
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
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Projekt auswählen *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-white text-text-primary focus:outline-none"
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Titel des Zeitstrahls *"
            placeholder="z.B. Weimarer Republik oder Geschichte der Genetik"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />

          <Input
            label="Beschreibung (optional)"
            placeholder="Kurze Zusammenfassung des Zeitraums oder Themas"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />

          <div className="flex justify-end gap-1.5 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              disabled={!newTitle.trim() || !selectedProjectId}
              onClick={handleCreate}
            >
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
