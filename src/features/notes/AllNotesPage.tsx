import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';

export const AllNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { notes, projects, createNote, deleteNote } = useStore();
  const allNotes = Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const projectList = Object.values(projects);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectList[0]?.id || '');
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    if (!selectedProjectId) return;
    const note = createNote(selectedProjectId, title.trim() || undefined);
    setShowCreate(false);
    setTitle('');
    navigate(`/projects/${selectedProjectId}/notes/${note.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Notiz wirklich löschen?')) {
      deleteNote(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-text-primary tracking-tight">Alle Notizen</h1>
            <p className="text-xs text-text-secondary mt-1">Strukturierte Lernnotizen und Zusammenfassungen</p>
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
              <Plus size={13} strokeWidth={2.5} /> Neue Notiz
            </Button>
          )}
        </div>

        {allNotes.length === 0 ? (
          <EmptyState
            icon={<StickyNote size={32} />}
            title="Noch keine Notizen"
            description="Erstelle deine erste Notiz für Zusammenfassungen und Lernstoff."
            action={
              projectList.length > 0 ? (
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                  <Plus size={14} /> Notiz erstellen
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
            {allNotes.map((n, i) => {
              const project = projects[n.projectId];
              return (
                <div
                  key={n.id}
                  onClick={() => navigate(`/projects/${n.projectId}/notes/${n.id}`)}
                  className={`w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left cursor-pointer group ${
                    i < allNotes.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <StickyNote size={16} className="text-text-disabled shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-medium text-text-primary truncate">{n.title || 'Ohne Titel'}</p>
                    {project && <p className="text-xs text-accent mt-0.5 font-medium">{project.title}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-disabled hidden sm:inline">{formatDate(n.updatedAt)}</span>
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
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
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Neue Notiz erstellen" size="sm">
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
            label="Titel der Notiz"
            placeholder="z.B. Vorlesung Mitschrift oder Kapitel 3 Zusammenfassung"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!selectedProjectId}>
              Erstellen & Öffnen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
