import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { Network, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import type { Mindmap } from '../../types';

export const AllMindmapsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mindmaps, projects, createMindmap, deleteMindmap } = useStore();
  const allMindmaps = Object.values(mindmaps) as Mindmap[];
  const projectList = Object.values(projects);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectList[0]?.id || '');
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !selectedProjectId) return;
    const m = createMindmap(selectedProjectId, title.trim());
    setShowCreate(false);
    setTitle('');
    navigate(`/projects/${selectedProjectId}/mindmaps/${m.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Mindmap wirklich löschen?')) {
      deleteMindmap(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-text-primary tracking-tight">Mindmaps</h1>
            <p className="text-xs text-text-secondary mt-1">Alle erstellten Mindmaps und Wissensstrukturen</p>
          </div>
          {projectList.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!selectedProjectId && projectList[0]) {
                  setSelectedProjectId(projectList[0].id);
                }
                setShowCreate(true);
              }}
              className="shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} /> Neue Mindmap
            </Button>
          )}
        </div>

        {allMindmaps.length === 0 ? (
          <EmptyState
            icon={<Network size={32} />}
            title="Noch keine Mindmaps"
            description="Erstelle deine erste Mindmap zur visuellen Strukturierung von Lernstoff."
            action={
              projectList.length > 0 ? (
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                  <Plus size={14} /> Mindmap erstellen
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/projects')}>
                  <Plus size={14} /> Erstes Projekt anlegen
                </Button>
              )
            }
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden bg-white shadow-xs">
            {allMindmaps.map((m, i) => {
              const project = projects[m.projectId];
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/projects/${m.projectId}/mindmaps/${m.id}`)}
                  className={`w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left cursor-pointer group ${
                    i < allMindmaps.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Network size={16} className="text-text-disabled shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-medium text-text-primary truncate">{m.title}</p>
                    {project && <p className="text-xs text-accent mt-0.5 font-medium">{project.title}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-disabled hidden sm:inline">{formatDate(m.updatedAt)}</span>
                    <button
                      onClick={(e) => handleDelete(e, m.id)}
                      className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded text-text-disabled hover:text-danger hover:bg-danger-light transition-all cursor-pointer"
                      title="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Neue Mindmap erstellen" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Projekt auswählen</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-white text-xs text-text-primary outline-none focus:border-accent"
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Titel der Mindmap"
            placeholder="z.B. Zellbiologie oder Römisches Reich"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!title.trim() || !selectedProjectId}>
              Erstellen & Öffnen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
